import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  CreateEmergencyDto,
  UpdateEmergencyDto,
  ChangeEmergencyStateDto,
  AssignCommanderDto,
  TransferCommandDto,
} from '../dto/';
import { EmergencyEntity } from '../entities/emergency.entity';
import { EmergencyStatus } from '../enums/emergency-status.enum';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { AttendEntity } from '../../attends/entities/attends.entity';
import { ChargeEntity } from '../../../sci_module/charges/entities/charges.entity';
import { Form201Entity } from '../../../incident_module/form-201/entities/form-201.entity';
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
import { RealtimeService } from '../../../notification/services/realtime.service';
import { EmergencyAccessService } from './emergency-access.service';
import { getAppTimezone } from '../../../config/timezone';

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
    private readonly emergencyAccessService: EmergencyAccessService,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  public async findAll(
    queryDto: QueryDto,
  ): Promise<PaginatedResult<EmergencyEntity>> {
    this.logger.log(
      `[findAll] Consultando emergencias. limit=${queryDto.limit ?? 'N/A'}, offset=${queryDto.offset ?? 'N/A'}, attr=${queryDto.attr ?? 'N/A'}`,
    );
    try {
      const { limit, offset, order = 'DESC', attr, value } = queryDto;
      validateAllowedAttrs(attr, EMERGENCY_ALLOWED_ATTRS);
      const query = this.emergencyRepository.createQueryBuilder('emergency');
      query.leftJoinAndSelect('emergency.user', 'user');
      // Solo asignaciones vigentes (no borradas), con su usuario: el listado muestra el CI y el
      // conteo de personal. Sin el usuario, el front no puede armar el nombre del comandante.
      query.leftJoinAndSelect('emergency.attends', 'attend', 'attend.is_deleted = false');
      query.leftJoinAndSelect('attend.charge', 'charge');
      query.leftJoinAndSelect('attend.user', 'attendUser');
      query.leftJoinAndSelect('emergency.form201', 'form201');
      query.andWhere('emergency.is_deleted = false');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      query.orderBy('emergency.date', order.toLocaleUpperCase() as any);
      if (attr && value)
        query.andWhere(`emergency.${attr} ILIKE :value`, { value: `%${value}%` });
      const [items, total] = await query.getManyAndCount();
      this.logger.log(`[findAll] Emergencias encontradas. total=${total}, entregadas=${items.length}`);
      return { items, total };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(
    createEmergencyDto: CreateEmergencyDto,
    userId: string,
  ): Promise<EmergencyEntity> {
    this.logger.log(
      `[create] Iniciando creación de emergencia. userId=${userId}, name=${createEmergencyDto.name}`,
    );
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
            // La zona no la decide el cliente: es la de la institución al momento del registro.
            timezone: getAppTimezone(),
            user: { id: userEntity.id },
          },
        );
        const emergencyCreated = await queryRunner.manager.save(
          emergencyCreate,
        );

        // Auto-asignación del creador como Comandante de Incidente inicial (Punto 3)
        try {
          const commanderCharge = await queryRunner.manager.findOne(
            ChargeEntity,
            { where: { systemName: 'incident_commander', isDeleted: false } },
          );
          if (commanderCharge) {
            const now = new Date();
            const hourStr = `${String(now.getHours()).padStart(2, '0')}:${String(
              now.getMinutes(),
            ).padStart(2, '0')}`;

            const initialCommanderAttend = queryRunner.manager.create(
              AttendEntity,
              {
                date: now,
                hour: hourStr,
                isActive: true,
                chargeSystemName: 'incident_commander',
                user: { id: userEntity.id },
                emergency: { id: emergencyCreated.id },
                charge: { id: commanderCharge.id },
              },
            );
            await queryRunner.manager.save(initialCommanderAttend);

            // Registro en bitácora
            const creatorName =
              `${userEntity.name || ''} ${userEntity.lastName || ''}`.trim() ||
              userEntity.email;
            const actionRecord = queryRunner.manager.create(ActionEntity, {
              description: `Emergencia creada. Comandante de Incidente inicial asignado: ${creatorName}`,
              date: now,
              hour: hourStr,
              user: { id: userEntity.id },
              emergency: { id: emergencyCreated.id },
            });
            await queryRunner.manager.save(actionRecord);

            this.logger.log(
              `[create] Comandante de Incidente inicial auto-asignado: user=${userEntity.id}, emergency=${emergencyCreated.id}`,
            );
          } else {
            this.logger.warn(
              `[create] Cargo 'incident_commander' no encontrado en catálogo. No se pudo auto-asignar CI inicial.`,
            );
          }
        } catch (ciError: any) {
          this.logger.warn(
            `[create] Advertencia al auto-asignar CI inicial: ${ciError.message}`,
          );
        }

        await queryRunner.commitTransaction();
        this.logger.log(
          `[create] Emergencia creada exitosamente. id=${emergencyCreated.id}, code=${nextCode}`,
        );
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
    this.logger.log(`[findOne] Buscando emergencia con relaciones completas. id=${id}`);
    try {
      const emergency: EmergencyEntity = await this.emergencyRepository.findOne({
        where: { id, isDeleted: false },
        relations: [
          'user',
          'attends',
          'attends.user',
          'attends.charge',
          'initialAssessment',
          'form201',
        ],
      });

      if (emergency) {
        if (emergency.attends) {
          emergency.attends = emergency.attends.filter(
            (attend) => !attend.isDeleted,
          );
        }
        if (emergency.form201) {
          emergency.form201 = emergency.form201.filter(
            (form) => !form.isDeleted,
          );
        }
      }

      if (!emergency) {
        this.logger.warn(`[findOne] Emergencia no encontrada. id=${id}`);
        throw new NotFoundException('Emergencia no encontrada.');
      }
      this.logger.log(
        `[findOne] Emergencia encontrada. id=${emergency.id}, code=${emergency.code}, state=${emergency.state}`,
      );
      return emergency;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateEmergencyDto: UpdateEmergencyDto,
    userId?: string,
    userRole?: string,
  ): Promise<EmergencyEntity> {
    this.logger.log(`[update] Actualizando emergencia. id=${id}`);
    try {
      const emergency: EmergencyEntity = await this.findOne(id);
      this.assertEditable(emergency);
      if (userRole) {
        await this.emergencyAccessService.assertCommanderOrManager(
          emergency.id,
          userId,
          userRole,
          'Solo el Comandante del Incidente o un usuario con rol Manager o superior puede editar la emergencia.',
        );
      }
      // La zona horaria queda fija desde la creación: no se acepta del cliente.
      const { timezone: _ignoredTimezone, ...updateEmergency } = updateEmergencyDto as UpdateEmergencyDto & { timezone?: string };
      const emergencyUpdated = await this.emergencyRepository.update(
        emergency.id,
        updateEmergency,
      );
      if (emergencyUpdated.affected === 0) {
        this.logger.warn(`[update] No se modificó ningún registro. id=${id}`);
        throw new NotFoundException('Emergencia no actualizada.');
      }
      this.logger.log(`[update] Emergencia actualizada exitosamente. id=${id}`);
      this.realtimeService?.notifyEmergency(emergency.id, 'emergency', 'update', emergency.id);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public assertEditable(emergency: EmergencyEntity): void {
    if (emergency.state === EmergencyStatus.Finished) {
      this.logger.warn(`[assertEditable] Operación rechazada: emergencia finalizada. id=${emergency.id}`);
      throw new BadRequestException(
        'La emergencia está finalizada. No se permiten ediciones. Solicite reapertura a un administrador.',
      );
    }
    if (emergency.state === EmergencyStatus.Canceled) {
      this.logger.warn(`[assertEditable] Operación rechazada: emergencia cancelada. id=${emergency.id}`);
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
    this.logger.log(
      `[changeState] Transición de estado solicitada. id=${id}, targetState=${changeStateDto.state}, userId=${userId}, userRole=${userRole}`,
    );
    try {
      const emergency = await this.emergencyRepository.findOne({
        where: { id, isDeleted: false },
        relations: ['form201', 'form207'],
      });
      if (!emergency) {
        this.logger.warn(`[changeState] Emergencia no encontrada. id=${id}`);
        throw new NotFoundException('Emergencia no encontrada.');
      }

      await this.emergencyAccessService.assertCommanderOrManager(
        emergency.id,
        userId,
        userRole,
        'Solo el Comandante del Incidente o un usuario con rol Manager o superior puede cambiar el estado de la emergencia.',
      );

      const from = emergency.state;
      const to = changeStateDto.state;
      this.stateMachine.assertTransition(from, to);

      if (
        (from === EmergencyStatus.Pending || from === EmergencyStatus.Active) &&
        to === EmergencyStatus.Canceled
      ) {
        if (!changeStateDto.cancellationReason) {
          this.logger.warn(`[changeState] Cancelación rechazada por falta de motivo. id=${id}`);
          throw new BadRequestException(
            'El motivo de cancelación es obligatorio.',
          );
        }
      }

      if (from === EmergencyStatus.Active && to === EmergencyStatus.Finished) {
        const pendingForms = this.getPendingForms(emergency);
        if (pendingForms.length) {
          this.logger.warn(
            `[changeState] Finalización rechazada. Formularios pendientes: ${pendingForms.join(', ')}. id=${id}`,
          );
          throw new BadRequestException(
            `No se puede finalizar la emergencia. Formularios pendientes de finalizar: ${pendingForms.join(
              ', ',
            )}`,
          );
        }
      }

      if (from === EmergencyStatus.Finished && to === EmergencyStatus.Active) {
        if (userRole !== ROLES.MANAGER && userRole !== ROLES.ADMIN && userRole !== ROLES.SUADMIN) {
          this.logger.warn(`[changeState] Reapertura rechazada por rol insuficiente. userId=${userId}, role=${userRole}`);
          throw new ForbiddenException(
            'Solo un usuario MANAGER puede reabrir una emergencia finalizada.',
          );
        }
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

      this.logger.log(`[changeState] Estado de emergencia cambiado con éxito: ${from} -> ${to}. id=${id}`);
      return this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ApiResponse<null>> {
    this.logger.log(`[delete] Eliminando emergencia. id=${id}`);
    try {
      const emergency = await this.findOne(id);
      const deletedEmergency = await this.emergencyRepository.update(
        emergency.id,
        { isDeleted: true },
      );
      if (deletedEmergency.affected === 0)
        throw new BadRequestException('Emergencia no eliminada.');
      this.logger.log(`[delete] Emergencia eliminada exitosamente. id=${id}`);
      this.realtimeService?.notifyEmergency(emergency.id, 'emergency', 'delete', emergency.id);
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

  public async assignCommander(
    emergencyId: string,
    assignCommanderDto: AssignCommanderDto,
    requesterId: string,
    requesterRole: string,
  ): Promise<EmergencyEntity> {
    this.logger.log(
      `[assignCommander] Asignando CI inicial para emergencia ${emergencyId}. nuevoCI=${assignCommanderDto.commanderUserId}, requester=${requesterId}`,
    );
    try {
      const emergency = await this.findOne(emergencyId);
      this.assertEditable(emergency);

      const roleLower = requesterRole?.toLowerCase();
      const isManagerOrAbove =
        roleLower === ROLES.MANAGER ||
        roleLower === ROLES.ADMIN ||
        roleLower === ROLES.SUADMIN;
      const isCreator = emergency.user?.id === requesterId;

      if (!isManagerOrAbove && !isCreator) {
        throw new ForbiddenException(
          'Solo un usuario con rol Manager o superior, o el creador de la emergencia, puede asignar al Comandante de Incidente inicial.',
        );
      }

      const targetUserId =
        assignCommanderDto.commanderUserId || assignCommanderDto.userId;
      if (!targetUserId) {
        throw new BadRequestException('El ID del comandante es obligatorio.');
      }

      const newCommanderUser = await this.userService.findOne(targetUserId);
      if (!newCommanderUser || !newCommanderUser.isActive) {
        throw new BadRequestException(
          'El usuario a asignar como Comandante de Incidente no existe o se encuentra inactivo.',
        );
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const commanderCharge = await queryRunner.manager.findOne(
          ChargeEntity,
          { where: { systemName: 'incident_commander', isDeleted: false } },
        );
        if (!commanderCharge) {
          throw new NotFoundException(
            'Cargo de Comandante del Incidente no encontrado en el catálogo.',
          );
        }

        // Buscar si ya hay un CI activo
        const currentActiveCI = await queryRunner.manager.findOne(AttendEntity, {
          where: {
            emergency: { id: emergencyId },
            chargeSystemName: 'incident_commander',
            isActive: true,
            isDeleted: false,
          },
          relations: ['user'],
        });

        if (currentActiveCI?.user?.id === newCommanderUser.id) {
          throw new ConflictException(
            'El usuario indicado ya es el Comandante del Incidente activo.',
          );
        }

        // Al ser asignación inicial (no traspaso formal), se libera la asignación previa provisional
        if (currentActiveCI) {
          currentActiveCI.isActive = false;
          currentActiveCI.isDeleted = true;
          await queryRunner.manager.save(currentActiveCI);
        }

        const now = new Date();
        const hourStr = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes(),
        ).padStart(2, '0')}`;

        // Asignar el nuevo CI
        const newCIAttend = queryRunner.manager.create(AttendEntity, {
          date: now,
          hour: hourStr,
          isActive: true,
          chargeSystemName: 'incident_commander',
          charge: { id: commanderCharge.id },
          user: { id: newCommanderUser.id },
          emergency: { id: emergency.id },
        });
        await queryRunner.manager.save(newCIAttend);

        const newName =
          `${newCommanderUser.name || ''} ${newCommanderUser.lastName || ''}`.trim() ||
          newCommanderUser.email;
        const actionRecord = queryRunner.manager.create(ActionEntity, {
          description: `Comandante de Incidente inicial asignado: ${newName}`,
          date: now,
          hour: hourStr,
          user: { id: requesterId },
          emergency: { id: emergency.id },
        });
        await queryRunner.manager.save(actionRecord);

        await queryRunner.commitTransaction();
        this.logger.log(
          `[assignCommander] CI asignado exitosamente: user=${newCommanderUser.id} en emergencia=${emergencyId}`,
        );
        return await this.findOne(emergencyId);
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

  public async transferCommand(
    emergencyId: string,
    transferCommandDto: TransferCommandDto,
    requesterId: string,
    requesterRole: string,
  ): Promise<EmergencyEntity> {
    this.logger.log(
      `[transferCommand] Iniciando traspaso formal de mando en emergencia ${emergencyId}. nuevoCI=${transferCommandDto.newCommanderUserId}, requester=${requesterId}`,
    );
    try {
      const emergency = await this.findOne(emergencyId);
      this.assertEditable(emergency);

      // 1. Validar que no haya Formulario 201 activo sin finalizar
      const activeF201 = await this.emergencyRepository.manager.findOne(
        Form201Entity,
        {
          where: {
            emergency: { id: emergencyId },
            isFinalized: false,
            isDeleted: false,
          },
        },
      );
      if (activeF201) {
        this.logger.warn(
          `[transferCommand] Traspaso rechazado: Formulario 201 (${activeF201.id}) aún no finalizado.`,
        );
        throw new BadRequestException(
          'Finaliza el Formulario 201 activo antes de traspasar el mando.',
        );
      }

      // 2. Verificar permisos del solicitante: Rol >= MANAGER O CI activo actual
      const roleLower = requesterRole?.toLowerCase();
      const isManagerOrAbove =
        roleLower === ROLES.MANAGER ||
        roleLower === ROLES.ADMIN ||
        roleLower === ROLES.SUADMIN;

      const currentActiveCI = await this.emergencyRepository.manager.findOne(
        AttendEntity,
        {
          where: {
            emergency: { id: emergencyId },
            chargeSystemName: 'incident_commander',
            isActive: true,
            isDeleted: false,
          },
          relations: ['user'],
        },
      );

      const isCurrentCI = currentActiveCI?.user?.id === requesterId;
      if (!isManagerOrAbove && !isCurrentCI) {
        throw new ForbiddenException(
          'Solo el Comandante del Incidente activo o un usuario con rol Manager o superior puede traspasar el mando.',
        );
      }

      // 3. Validar nuevo CI
      const targetUserId =
        transferCommandDto.newCommanderUserId ||
        transferCommandDto.commanderUserId ||
        transferCommandDto.userId;
      if (!targetUserId) {
        throw new BadRequestException(
          'El ID del nuevo comandante es obligatorio.',
        );
      }

      const newCommanderUser = await this.userService.findOne(targetUserId);
      if (!newCommanderUser || !newCommanderUser.isActive) {
        throw new BadRequestException(
          'El usuario a asumir como nuevo Comandante de Incidente no existe o está inactivo.',
        );
      }

      if (currentActiveCI?.user?.id === newCommanderUser.id) {
        throw new ConflictException(
          'El usuario indicado ya es el Comandante del Incidente activo.',
        );
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const commanderCharge = await queryRunner.manager.findOne(
          ChargeEntity,
          { where: { systemName: 'incident_commander', isDeleted: false } },
        );
        if (!commanderCharge) {
          throw new NotFoundException(
            'Cargo de Comandante del Incidente no encontrado en el catálogo.',
          );
        }

        // 4. Sellar periodo del CI anterior: isActive = false (mantiene historial del periodo)
        if (currentActiveCI) {
          currentActiveCI.isActive = false;
          await queryRunner.manager.save(currentActiveCI);
        }

        // Si el nuevo CI tenía otro attend activo en la emergencia, cerrarlo para asumir mando
        const existingAttendNewCI = await queryRunner.manager.findOne(
          AttendEntity,
          {
            where: {
              emergency: { id: emergencyId },
              user: { id: newCommanderUser.id },
              isActive: true,
              isDeleted: false,
            },
          },
        );
        if (existingAttendNewCI) {
          existingAttendNewCI.isActive = false;
          await queryRunner.manager.save(existingAttendNewCI);
        }

        // 5. Iniciar nuevo periodo de mando para el nuevo CI
        const now = new Date();
        const hourStr = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes(),
        ).padStart(2, '0')}`;

        const newPeriodCIAttend = queryRunner.manager.create(AttendEntity, {
          date: now,
          hour: hourStr,
          isActive: true,
          chargeSystemName: 'incident_commander',
          charge: { id: commanderCharge.id },
          user: { id: newCommanderUser.id },
          emergency: { id: emergency.id },
        });
        await queryRunner.manager.save(newPeriodCIAttend);

        // 6. Registro formal en bitácora
        const prevName = currentActiveCI?.user
          ? `${currentActiveCI.user.name || ''} ${currentActiveCI.user.lastName || ''}`.trim()
          : 'Comandante previo';
        const newName =
          `${newCommanderUser.name || ''} ${newCommanderUser.lastName || ''}`.trim() ||
          newCommanderUser.email;

        const actionRecord = queryRunner.manager.create(ActionEntity, {
          description: `Traspaso de mando: de ${prevName} a ${newName}`,
          date: now,
          hour: hourStr,
          user: { id: requesterId },
          emergency: { id: emergency.id },
        });
        await queryRunner.manager.save(actionRecord);

        await queryRunner.commitTransaction();
        this.logger.log(
          `[transferCommand] Traspaso de mando completado exitosamente: de ${prevName} a ${newName} en emergencia ${emergencyId}`,
        );
        return await this.findOne(emergencyId);
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

  private getPendingForms(emergency: EmergencyEntity): string[] {
    const pending: string[] = [];
    emergency.form201?.forEach((form) => {
      if (!form.isFinalized) pending.push(`F201 (${form.id})`);
    });
    emergency.form207?.forEach((form) => {
      if (!form.isFinalized) pending.push(`F207 (${form.id})`);
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
      return `Emergencia cancelada: ${changeStateDto.cancellationReason}`;
    if (from === EmergencyStatus.Finished && to === EmergencyStatus.Active)
      return 'Emergencia reabierta';
    return null;
  }
}
