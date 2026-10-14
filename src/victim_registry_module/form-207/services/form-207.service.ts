import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Form207Entity } from './../entities/form-207.entity';
import { CreateForm207Dto } from './../dto/create-form-207.dto';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import {
  EmergencyAccessService,
  FORM207_MANAGER_CHARGES,
} from '../../../organization_module/emergency/services/emergency-access.service';

const FORM207_FORBIDDEN_MESSAGE =
  'Solo el Comandante del Incidente, el Líder de la Unidad Médica o un usuario con rol Manager o superior puede gestionar el Formulario 207.';

/** Lugar de registro por defecto del SCI-207 (manual SCI: el ACV); el usuario puede cambiarlo. */
export const DEFAULT_FORM207_PLACE = 'Área de Concentración de Víctimas (ACV)';

@Injectable()
export class Form207Service {
  private readonly logger = new Logger('Form207Service');

  constructor(
    @InjectRepository(Form207Entity)
    private readonly form207Repository: Repository<Form207Entity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly emergencyService: EmergencyService,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly emergencyAccessService: EmergencyAccessService,
  ) {}

  async create(
    emergencyId: string,
    createForm207Dto: CreateForm207Dto,
    userId: string,
    userRole?: string,
  ): Promise<Form207Entity> {
    this.logger.log(
      `[create] Iniciando creación de Form207. emergencyId=${emergencyId}, userId=${userId}, clientGeneratedId=${createForm207Dto.clientGeneratedId ?? 'N/A'}`,
    );

    // Idempotencia offline
    if (createForm207Dto.clientGeneratedId) {
      const existing = await this.form207Repository.findOne({
        where: { clientGeneratedId: createForm207Dto.clientGeneratedId },
        relations: ['user', 'emergency'],
      });
      if (existing) {
        this.logger.warn(
          `[create] Idempotencia: Form207 con clientGeneratedId=${createForm207Dto.clientGeneratedId} ya existe. id=${existing.id}, code=${existing.code}`,
        );
        return existing;
      }
    }

    if (userRole) {
      await this.emergencyAccessService.assertHasCharge(
        emergencyId,
        userId,
        userRole,
        FORM207_MANAGER_CHARGES,
        FORM207_FORBIDDEN_MESSAGE,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const emergency = await queryRunner.manager.findOne(EmergencyEntity, {
        where: { id: emergencyId, isDeleted: false },
      });
      if (!emergency) {
        this.logger.warn(`[create] Emergencia no encontrada. emergencyId=${emergencyId}`);
        throw new NotFoundException('Emergencia no encontrada.');
      }
      this.emergencyService.assertEditable(emergency);

      // Contador atómico
      const rawResult = await queryRunner.manager.query(
        `INSERT INTO emergency_form207_counter (emergency_id, last_value)
         VALUES ($1, 1)
         ON CONFLICT (emergency_id)
         DO UPDATE SET last_value = emergency_form207_counter.last_value + 1
         RETURNING last_value`,
        [emergencyId],
      );

      const lastValue = rawResult[0].last_value;
      const code = `F207-${String(lastValue).padStart(3, '0')}`;

      const user = await queryRunner.manager.findOne(UserEntity, {
        where: { id: userId },
      });
      if (!user) {
        this.logger.warn(`[create] Usuario no encontrado. userId=${userId}`);
        throw new NotFoundException('Usuario no encontrado.');
      }

      const form207 = queryRunner.manager.create(Form207Entity, {
        ...createForm207Dto,
        // El DTO lo admite vacío (móvil/offline) pero la columna es NOT NULL: antes daba 500.
        placeOfRegistration: createForm207Dto.placeOfRegistration?.trim() || DEFAULT_FORM207_PLACE,
        code,
        emergency,
        user,
      });

      const savedForm = await queryRunner.manager.save(Form207Entity, form207);
      await queryRunner.commitTransaction();
      this.logger.log(
        `[create] Form207 creado exitosamente. id=${savedForm.id}, code=${savedForm.code}, emergencyId=${emergencyId}`,
      );
      return savedForm;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[create] Error al crear Form207. emergencyId=${emergencyId}. Error: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByEmergency(
    emergencyId: string,
    userId?: string,
    userRole?: string,
  ): Promise<Form207Entity[]> {
    this.logger.log(`[findByEmergency] Buscando Form207s. emergencyId=${emergencyId}`);
    const emergency = await this.emergencyService.findOne(emergencyId);
    if (userRole) {
      await this.emergencyAccessService.assertCanViewPatients(emergency.id, userId, userRole);
    }
    const results = await this.form207Repository.find({
      where: { emergency: { id: emergency.id }, isDeleted: false },
      relations: ['user', 'emergency'],
      order: { createdAt: 'ASC' },
    });
    this.logger.log(`[findByEmergency] Encontrados ${results.length} formularios. emergencyId=${emergencyId}`);
    return results;
  }

  async findOne(id: string): Promise<Form207Entity> {
    this.logger.log(`[findOne] Buscando Form207. id=${id}`);
    const form207 = await this.form207Repository.findOne({
      where: { id, isDeleted: false },
      relations: ['emergency', 'user'],
    });
    if (!form207) {
      this.logger.warn(`[findOne] Form207 no encontrado. id=${id}`);
      throw new NotFoundException(`Formulario 207 con ID ${id} no encontrado.`);
    }
    this.logger.log(`[findOne] Form207 encontrado. id=${form207.id}, code=${form207.code}`);
    return form207;
  }

  /** Detalle de una planilla aplicando la privacidad de datos de pacientes (decisión 18). */
  async findOneForUser(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<Form207Entity> {
    const form207 = await this.findOne(id);
    await this.emergencyAccessService.assertCanViewPatients(form207.emergency.id, userId, userRole);
    return form207;
  }

  async finalize(
    id: string,
    userId: string,
    userRole?: string,
  ): Promise<Form207Entity> {
    this.logger.log(`[finalize] Iniciando finalización de Form207. id=${id}, userId=${userId}`);
    const form207 = await this.findOne(id);
    this.emergencyService.assertEditable(form207.emergency);

    if (userRole) {
      await this.emergencyAccessService.assertHasCharge(
        form207.emergency.id,
        userId,
        userRole,
        FORM207_MANAGER_CHARGES,
        FORM207_FORBIDDEN_MESSAGE,
      );
    }

    if (form207.isFinalized) {
      this.logger.warn(`[finalize] Form207 ya estaba finalizado. id=${id}, code=${form207.code}`);
      throw new BadRequestException('El formulario ya está finalizado.');
    }

    try {
      form207.isFinalized = true;
      const savedForm = await this.form207Repository.save(form207);

      // Bitácora
      const now = new Date();
      const user = await this.userService.findOne(userId);
      await this.actionRepository.save(
        this.actionRepository.create({
          description: `Formulario 207 finalizado (${form207.code})`,
          date: now,
          hour: `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes(),
          ).padStart(2, '0')}`,
          user,
          emergency: form207.emergency,
        }),
      );

      this.logger.log(`[finalize] Form207 finalizado exitosamente. id=${savedForm.id}, code=${savedForm.code}`);
      return savedForm;
    } catch (error) {
      this.logger.error(
        `[finalize] Error al finalizar Form207. id=${id}. Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
