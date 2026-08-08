import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateEmergencyDto } from '../dto/create-emergency.dto';
import { UpdateEmergencyDto } from '../dto/update-emergency.dto';
import { EmergencyEntity } from '../entities/emergency.entity';
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

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger('EmergencyService');

  constructor(
    @InjectRepository(EmergencyEntity)
    private readonly emergencyRepository: Repository<EmergencyEntity>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
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
}
