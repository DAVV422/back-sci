import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateAttendDto } from '../dto/create-attend.dto';
import { UpdateAttendDto } from '../dto/update-attend.dto';
import { AttendEntity } from '../entities/attends.entity';
import { OrganizationChangeEntity } from '../entities/organization-change.entity';
import { handlerError } from '../../../common/utils/handlerError.utils';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { UserService } from '../../../user/services/user.service';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { ChargeService } from '../../../sci_module/charges/services/charge.service';
import { ROLES } from '../../../common/constants';
import { RealtimeService } from '../../../notification/services/realtime.service';

@Injectable()
export class AttendService {
  private readonly logger = new Logger('AttendService');

  constructor(
    @InjectRepository(AttendEntity)
    private readonly attendRepository: Repository<AttendEntity>,
    @InjectRepository(OrganizationChangeEntity)
    private readonly organizationChangeRepository: Repository<OrganizationChangeEntity>,
    private readonly userService: UserService,
    private readonly emergencyService: EmergencyService,
    private readonly chargeService: ChargeService,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  public async assertCanManageAttends(
    emergencyId: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<void> {
    if (!requesterId || !requesterRole) return;

    const roleLower = requesterRole.toLowerCase();
    if (
      roleLower === ROLES.MANAGER ||
      roleLower === ROLES.ADMIN ||
      roleLower === ROLES.SUADMIN
    ) {
      return;
    }

    const emergency = await this.emergencyService.findOne(emergencyId);
    if (emergency?.user?.id === requesterId) {
      return;
    }

    const activeCI = await this.attendRepository.findOne({
      where: {
        emergency: { id: emergencyId },
        user: { id: requesterId },
        chargeSystemName: 'incident_commander',
        isActive: true,
        isDeleted: false,
      },
    });

    if (activeCI) {
      return;
    }

    this.logger.warn(
      `[assertCanManageAttends] Permiso denegado: userId=${requesterId}, role=${requesterRole} para emergencia=${emergencyId}`,
    );
    throw new ForbiddenException(
      'No tienes permisos para convocar o gestionar personal en esta emergencia. Se requiere ser Comandante del Incidente, el creador de la emergencia o tener rol Manager o superior.',
    );
  }

  public async findOne(id: string): Promise<AttendEntity> {
    this.logger.log(`[findOne] Buscando asistencia. id=${id}`);
    try {
      const attend: AttendEntity = await this.attendRepository.findOne({
        where: { id, isDeleted: false },
        relations: ['emergency', 'user', 'charge'],
      });
      if (!attend) {
        this.logger.warn(`[findOne] Asistencia no encontrada. id=${id}`);
        throw new NotFoundException('Asistencia no encontrada.');
      }
      this.logger.log(`[findOne] Asistencia encontrada. id=${attend.id}`);
      return attend;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(
    createAttendDto: CreateAttendDto,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<AttendEntity> {
    this.logger.log(
      `[create] Asignando personal/cargo a emergencia. userId=${createAttendDto.user}, emergencyId=${createAttendDto.emergency}, chargeId=${createAttendDto.charge}`,
    );
    try {
      await this.assertCanManageAttends(
        createAttendDto.emergency,
        requesterId,
        requesterRole,
      );
      const { user, emergency, charge, ...createAttend } = createAttendDto;
      const userEntity = await this.userService.findOne(user);
      const emergencyEntity = await this.emergencyService.findOne(emergency);
      this.emergencyService.assertEditable(emergencyEntity);
      const chargeEntity = await this.chargeService.findOne(charge);
      const attend_create: AttendEntity = this.attendRepository.create({
        ...createAttend,
        user: { id: userEntity.id },
        emergency: { id: emergencyEntity.id },
        charge: { id: chargeEntity.id },
        chargeSystemName: chargeEntity.systemName ?? null,
        isActive: true,
      });

      if (chargeEntity.systemName === 'incident_commander') {
        const activeCI = await this.attendRepository.findOne({
          where: {
            emergency: { id: emergencyEntity.id },
            chargeSystemName: 'incident_commander',
            isActive: true,
            isDeleted: false,
          },
        });
        if (activeCI) {
          this.logger.warn(`[create] Ya existe un CI activo para la emergencia ${emergencyEntity.id}`);
          throw new ConflictException(
            'Ya existe un Comandante del Incidente activo para esta emergencia.',
          );
        }
      }

      let attend_created: AttendEntity;
      try {
        attend_created = await this.attendRepository.save(attend_create);
      } catch (error) {
        if (error?.code === '23505') {
          this.logger.warn(`[create] Conflicto de exclusividad de CI: ${error.message}`);
          throw new ConflictException(
            'Ya existe un Comandante del Incidente activo para esta emergencia.',
          );
        }
        throw error;
      }
      this.logger.log(`[create] Asistencia asignada exitosamente. id=${attend_created.id}, charge=${chargeEntity.systemName}`);
      return await this.findOne(attend_created.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateAttendDto: UpdateAttendDto,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<AttendEntity> {
    this.logger.log(
      `[update] Actualizando cargo de asistencia. id=${id}, newChargeId=${updateAttendDto.chargeId}`,
    );
    try {
      const attend = await this.findOne(id);
      if (attend.emergency) {
        this.emergencyService.assertEditable(attend.emergency);
        await this.assertCanManageAttends(
          attend.emergency.id,
          requesterId,
          requesterRole,
        );
      }

      // Proteger modificación directa del CI activo
      if (attend.chargeSystemName === 'incident_commander' && attend.isActive) {
        throw new BadRequestException(
          'El Comandante de Incidente activo no puede modificarse mediante esta vía. Utilice la asignación o el traspaso formal de mando.',
        );
      }

      const { chargeId } = updateAttendDto;
      const chargeEntity = await this.chargeService.findOne(chargeId);

      if (chargeEntity.systemName === 'incident_commander') {
        const activeCI = await this.attendRepository.findOne({
          where: {
            emergency: { id: attend.emergency.id },
            chargeSystemName: 'incident_commander',
            isActive: true,
            isDeleted: false,
          },
        });
        if (activeCI && activeCI.id !== attend.id) {
          this.logger.warn(
            `[update] Conflicto: ya existe otro CI activo para la emergencia ${attend.emergency.id}`,
          );
          throw new ConflictException(
            'Ya existe un Comandante del Incidente activo para esta emergencia.',
          );
        }
      }

      let updated;
      try {
        updated = await this.attendRepository.update(attend.id, {
          charge: { id: chargeEntity.id },
          chargeSystemName: chargeEntity.systemName ?? null,
        });
      } catch (error) {
        if (error?.code === '23505')
          throw new ConflictException(
            'Ya existe un Comandante del Incidente activo para esta emergencia.',
          );
        throw error;
      }
      if (updated.affected === 0)
        throw new BadRequestException('Asistencia no actualizada.');
      this.logger.log(`[update] Asistencia actualizada exitosamente. id=${id}`);
      this.realtimeService?.notifyEmergency(attend.emergency?.id, 'attend', 'update', attend.id);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(
    id: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<ApiResponse<null>> {
    this.logger.log(`[delete] Eliminando asistencia. id=${id}`);
    try {
      const attend = await this.findOne(id);
      if (attend.emergency) {
        this.emergencyService.assertEditable(attend.emergency);
        await this.assertCanManageAttends(
          attend.emergency.id,
          requesterId,
          requesterRole,
        );
      }

      // Proteger eliminación directa del CI activo
      if (attend.chargeSystemName === 'incident_commander' && attend.isActive) {
        throw new BadRequestException(
          'El Comandante de Incidente activo no puede eliminarse mediante esta vía. Utilice la asignación o el traspaso formal de mando.',
        );
      }

      const deletedAttend = await this.attendRepository.update(attend.id, {
        isDeleted: true,
      });
      if (deletedAttend.affected === 0)
        throw new BadRequestException('Asistencia no eliminada.');
      this.logger.log(`[delete] Asistencia eliminada exitosamente. id=${id}`);
      this.realtimeService?.notifyEmergency(attend.emergency?.id, 'attend', 'delete', attend.id);
      return {
        success: true,
        statusCode: 200,
        message: 'Asistencia eliminada.',
        data: null,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /** Casilla 14: cambios de la estructura en orden cronológico (los registra un trigger de la base). */
  public async findOrganizationHistory(emergencyId: string): Promise<OrganizationChangeEntity[]> {
    return this.organizationChangeRepository.find({
      where: { emergency: { id: emergencyId } },
      order: { occurredAt: 'ASC', createdAt: 'ASC' },
    });
  }

  public async findByEmergency(emergencyId: string): Promise<AttendEntity[]> {
    this.logger.log(`[findByEmergency] Listando asistencias para emergencia ${emergencyId}`);
    try {
      const attends: AttendEntity[] = await this.attendRepository.find({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['emergency', 'user', 'charge'],
      });
      if (!attends || attends.length === 0) {
        this.logger.warn(`[findByEmergency] No se encontraron asistencias. emergencyId=${emergencyId}`);
        throw new NotFoundException(
          'No se encontraron asistencias para esta emergencia.',
        );
      }
      this.logger.log(`[findByEmergency] Encontradas ${attends.length} asistencias. emergencyId=${emergencyId}`);
      return attends;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByUser(userId: string): Promise<AttendEntity[]> {
    this.logger.log(`[findByUser] Listando asistencias para usuario ${userId}`);
    try {
      const attends: AttendEntity[] = await this.attendRepository.find({
        where: { user: { id: userId }, isDeleted: false },
        relations: ['emergency', 'user'],
      });
      if (!attends || attends.length === 0) {
        this.logger.warn(`[findByUser] No se encontraron asistencias. userId=${userId}`);
        throw new NotFoundException(
          'No se encontraron asistencias para este usuario.',
        );
      }
      this.logger.log(`[findByUser] Encontradas ${attends.length} asistencias. userId=${userId}`);
      return attends;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
