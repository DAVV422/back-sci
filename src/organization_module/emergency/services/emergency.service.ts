import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateEmergencyDto } from '../dto/create-emergency.dto';
import { UpdateEmergencyDto } from '../dto/update-emergency.dto';
import { ChangeEmergencyStateDto } from '../dto/change-emergency-state.dto';
import { EmergencyEntity } from '../entities/emergency.entity';
import { EmergencyStatus } from '../enums/emergency-status.enum';
import { ActionEntity } from './../../../incident_module/action/entities/action.entity';
import { handlerError } from '../../../common/utils/handlerError.utils';
import { QueryDto } from '../../../common/dto/query.dto';
import {
  ApiResponse,
  PaginatedResult,
} from '../../../common/interfaces/responseMessage.interface';
import {
  EMERGENCY_ALLOWED_ATTRS,
  validateAllowedAttrs,
} from '../../../common/decorators/allowed-query-attrs.decorator';
import { UserService } from '../../../user/services/user.service';
import { ROLES } from '../../../common/constants';
import { EmergencyStateMachine } from './emergency-state-machine';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger('EmergencyService');

  constructor(
    @InjectRepository(EmergencyEntity)
    private readonly emergencyRepository: Repository<EmergencyEntity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly stateMachine: EmergencyStateMachine,
  ) {}

  public async findAll(
    queryDto: QueryDto,
  ): Promise<PaginatedResult<EmergencyEntity>> {
    try {
      const { limit, offset, order = 'DESC', attr, value } = queryDto;
      validateAllowedAttrs(attr, EMERGENCY_ALLOWED_ATTRS);
      const query = this.emergencyRepository.createQueryBuilder('emergency');
      query.leftJoinAndSelect('emergency.user', 'user');
      query.leftJoinAndSelect('emergency.attends', 'attend');
      query.leftJoinAndSelect('attend.charge', 'charge');
      query.leftJoinAndSelect('emergency.form201', 'form201');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      query.orderBy('emergency.date', order.toLocaleUpperCase() as any);
      if (attr && value)
        query.where(`emergency.${attr} ILIKE :value`, { value: `%${value}%` });
      const [items, total] = await query.getManyAndCount();
      return { items, total };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(
    createEmergencyDto: CreateEmergencyDto,
    userId: string,
  ): Promise<EmergencyEntity> {
    try {
      const { ...createEmergency } = createEmergencyDto;
      const userEntity = await this.userService.findOne(userId);

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const result = await queryRunner.query(
          `SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1 AS next_val FROM emergency`,
        );
        const nextCode = `EMG-${String(result[0].next_val).padStart(3, '0')}`;
        const emergencyCreate: EmergencyEntity = queryRunner.manager.create(
          EmergencyEntity,
          {
            ...createEmergency,
            code: nextCode,
            state: EmergencyStatus.Pending,
            user: { id: userEntity.id },
          },
        );
        const emergencyCreated = await queryRunner.manager.save(
          emergencyCreate,
        );
        await queryRunner.commitTransaction();
        return await this.findOne(emergencyCreated.id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<EmergencyEntity> {
    try {
      const emergency: EmergencyEntity = await this.emergencyRepository.findOne(
        { where: { id } },
      );
      if (!emergency) throw new NotFoundException('Emergencia no encontrada.');
      return emergency;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateEmergencyDto: UpdateEmergencyDto,
  ): Promise<EmergencyEntity> {
    try {
      const emergency: EmergencyEntity = await this.findOne(id);
      this.assertEditable(emergency);
      const { ...updateEmergency } = updateEmergencyDto;
      const emergencyUpdated = await this.emergencyRepository.update(
        emergency.id,
        updateEmergency,
      );
      if (emergencyUpdated.affected === 0)
        throw new NotFoundException('Emergencia no actualizada.');
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public assertEditable(emergency: EmergencyEntity): void {
    if (emergency.state === EmergencyStatus.Finished) {
      throw new BadRequestException(
        'La emergencia está finalizada. No se permiten ediciones. Solicite reapertura a un administrador.',
      );
    }
    if (emergency.state === EmergencyStatus.Canceled) {
      throw new BadRequestException(
        'La emergencia está cancelada. No se permiten ediciones.',
      );
    }
  }

  public async changeState(
    id: string,
    changeStateDto: ChangeEmergencyStateDto,
    userId: string,
    userRole: string,
  ): Promise<EmergencyEntity> {
    try {
      const emergency = await this.emergencyRepository.findOne({
        where: { id },
        relations: ['form201', 'form207'],
      });
      if (!emergency) throw new NotFoundException('Emergencia no encontrada.');

      const from = emergency.state;
      const to = changeStateDto.state;
      this.stateMachine.assertTransition(from, to);

      if (
        (from === EmergencyStatus.Pending || from === EmergencyStatus.Active) &&
        to === EmergencyStatus.Canceled
      ) {
        if (!changeStateDto.cancellation_reason)
          throw new BadRequestException(
            'El motivo de cancelación es obligatorio.',
          );
      }

      if (from === EmergencyStatus.Active && to === EmergencyStatus.Finished) {
        const pendingForms = this.getPendingForms(emergency);
        if (pendingForms.length)
          throw new BadRequestException(
            `No se puede finalizar la emergencia. Formularios pendientes de finalizar: ${pendingForms.join(
              ', ',
            )}`,
          );
      }

      if (from === EmergencyStatus.Finished && to === EmergencyStatus.Active) {
        if (userRole !== ROLES.MANAGER && userRole !== ROLES.ADMIN)
          throw new ForbiddenException(
            'Solo un usuario MANAGER puede reabrir una emergencia finalizada.',
          );
      }

      emergency.state = to;
      await this.emergencyRepository.save(emergency);

      const actionDescription = this.buildTransitionActionDescription(
        from,
        to,
        changeStateDto,
      );
      if (actionDescription) {
        const user = await this.userService.findOne(userId);
        const now = new Date();
        await this.actionRepository.save(
          this.actionRepository.create({
            description: actionDescription,
            date: now,
            hour: `${String(now.getHours()).padStart(2, '0')}:${String(
              now.getMinutes(),
            ).padStart(2, '0')}`,
            user,
            emergency,
          }),
        );
      }

      return this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const emergency = await this.findOne(id);
      const deletedEmergency = await this.emergencyRepository.delete(
        emergency.id,
      );
      if (deletedEmergency.affected === 0)
        throw new BadRequestException('Emergencia no eliminada.');
      return {
        success: true,
        statusCode: 200,
        message: 'Emergencia eliminada.',
        data: null,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  private getPendingForms(emergency: EmergencyEntity): string[] {
    const pending: string[] = [];
    emergency.form201?.forEach((form) => {
      if (!form.is_finalized) pending.push(`F201 (${form.id})`);
    });
    emergency.form207?.forEach((form) => {
      if (!form.is_finalized) pending.push(`F207 (${form.id})`);
    });
    return pending;
  }

  private buildTransitionActionDescription(
    from: EmergencyStatus,
    to: EmergencyStatus,
    changeStateDto: ChangeEmergencyStateDto,
  ): string | null {
    if (from === EmergencyStatus.Pending && to === EmergencyStatus.Active)
      return 'Emergencia activada';
    if (
      (from === EmergencyStatus.Pending || from === EmergencyStatus.Active) &&
      to === EmergencyStatus.Canceled
    )
      return `Emergencia cancelada: ${changeStateDto.cancellation_reason}`;
    if (from === EmergencyStatus.Finished && to === EmergencyStatus.Active)
      return 'Emergencia reabierta';
    return null;
  }
}
