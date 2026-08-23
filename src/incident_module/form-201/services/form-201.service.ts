import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateForm201Dto } from '../dto/create-form-201.dto';
import { UpdateForm201Dto } from '../dto/update-form-201.dto';
import { Form201Entity } from '../entities/form-201.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { AttendEntity } from '../../../organization_module/attends/entities/attends.entity';
import { ActionEntity } from '../../action/entities/action.entity';

@Injectable()
export class Form201Service {
  private readonly logger = new Logger('Form201Service');

  constructor(
    @InjectRepository(Form201Entity)
    private readonly form201Repository: Repository<Form201Entity>,
    @InjectRepository(AttendEntity)
    private readonly attendRepository: Repository<AttendEntity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly emergencyService: EmergencyService,
    private readonly userService: UserService,
  ) {}

  async create(
    emergencyId: string,
    createForm201Dto: CreateForm201Dto,
    userId: string,
  ): Promise<Form201Entity> {
    this.logger.log(
      `[create] Iniciando creación de Form201. emergencyId=${emergencyId}, userId=${userId}, clientGeneratedId=${createForm201Dto.clientGeneratedId ?? 'N/A'}`,
    );
    try {
      if (createForm201Dto.clientGeneratedId) {
        const existing = await this.form201Repository.findOne({
          where: { clientGeneratedId: createForm201Dto.clientGeneratedId },
          relations: ['emergency', 'user'],
        });
        if (existing) {
          this.logger.warn(
            `[create] Idempotencia: Form201 con clientGeneratedId ${createForm201Dto.clientGeneratedId} ya procesado. id=${existing.id}`,
          );
          return existing;
        }
      }

      const emergencyEntity = await this.emergencyService.findOne(emergencyId);
      this.emergencyService.assertEditable(emergencyEntity);

      // Validar exclusividad del Formulario 201 activo
      const activeForm = await this.form201Repository.findOne({
        where: { emergency: { id: emergencyId }, isDeleted: false },
      });
      if (activeForm) {
        this.logger.warn(`[create] Ya existe un Form201 activo para la emergencia ${emergencyId}`);
        throw new BadRequestException(
          'Ya existe un Formulario 201 activo para esta emergencia.',
        );
      }

      const userEntity = await this.userService.findOne(userId);

      // Generar código correlativo incremental seguro
      const totalFormsCount = await this.form201Repository.count({
        where: { emergency: { id: emergencyId } },
      });
      const code = `F201-${String(totalFormsCount + 1).padStart(3, '0')}`;

      // Capturar organigrama (snapshot inmutable de attends)
      const attends = await this.attendRepository.find({
        where: { emergency: { id: emergencyId }, is_active: true, isDeleted: false },
        relations: ['user', 'charge'],
      });

      const organizationChart = attends.map((att) => ({
        attendId: att.id,
        user: {
          id: att.user.id,
          name: att.user.name,
          lastName: att.user.last_name,
        },
        charge: {
          id: att.charge.id,
          name: att.charge.name,
          level: att.charge.level,
          systemName: att.charge_system_name,
        },
        date: att.date,
        hour: att.hour,
      }));

      const form201 = this.form201Repository.create({
        ...createForm201Dto,
        code,
        organizationChart: createForm201Dto.organizationChart || { members: organizationChart },
        emergency: emergencyEntity,
        user: userEntity,
      });

      try {
        const saved = await this.form201Repository.save(form201);
        this.logger.log(
          `[create] Form201 creado exitosamente. id=${saved.id}, code=${saved.code}, emergencyId=${emergencyId}`,
        );
        return saved;
      } catch (error) {
        if (error?.code === '23505') {
          this.logger.warn(`[create] Conflicto de código o exclusividad: ${error.message}`);
          throw new ConflictException(
            'Ya existe un Formulario 201 activo para esta emergencia.',
          );
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`[create] Error al crear Form201. emergencyId=${emergencyId}. Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Form201Entity> {
    this.logger.log(`[findOne] Buscando Form201. id=${id}`);
    try {
      const form201 = await this.form201Repository.findOne({
        where: { id, isDeleted: false },
        relations: ['emergency', 'user'],
      });
      if (!form201) {
        this.logger.warn(`[findOne] Form201 no encontrado. id=${id}`);
        throw new NotFoundException('Formulario 201 no encontrado.');
      }
      this.logger.log(`[findOne] Form201 encontrado. id=${form201.id}, code=${form201.code}`);
      return form201;
    } catch (error) {
      this.logger.error(`[findOne] Error al buscar Form201: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findActiveByEmergency(emergencyId: string): Promise<Form201Entity> {
    this.logger.log(`[findActiveByEmergency] Buscando Form201 activo. emergencyId=${emergencyId}`);
    try {
      const form201 = await this.form201Repository.findOne({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['emergency', 'user'],
      });
      if (!form201) {
        this.logger.warn(`[findActiveByEmergency] No se encontró Form201 activo. emergencyId=${emergencyId}`);
        throw new NotFoundException(
          'No se encontró un Formulario 201 activo para esta emergencia.',
        );
      }
      this.logger.log(`[findActiveByEmergency] Form201 activo encontrado. id=${form201.id}, code=${form201.code}`);
      return form201;
    } catch (error) {
      this.logger.error(`[findActiveByEmergency] Error al buscar Form201 por emergencia: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByEmergency(emergencyId: string): Promise<Form201Entity[]> {
    this.logger.log(`[findByEmergency] Listando Form201s por emergencia. emergencyId=${emergencyId}`);
    try {
      const items = await this.form201Repository.find({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['emergency', 'user'],
      });
      this.logger.log(`[findByEmergency] Se encontraron ${items.length} formularios. emergencyId=${emergencyId}`);
      return items;
    } catch (error) {
      this.logger.error(`[findByEmergency] Error al listar Form201 por emergencia: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    updateForm201Dto: UpdateForm201Dto,
  ): Promise<Form201Entity> {
    this.logger.log(`[update] Actualizando Form201. id=${id}`);
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      if (form201.isFinalized) {
        this.logger.warn(`[update] Intento de actualizar Form201 ya finalizado. id=${id}`);
        throw new BadRequestException(
          'El formulario ya está finalizado y no se puede editar.',
        );
      }

      const { clientGeneratedId, code, isFinalized, ...updateData } = updateForm201Dto as any;
      await this.form201Repository.update(id, updateData);
      this.logger.log(`[update] Form201 actualizado exitosamente. id=${id}`);

      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`[update] Error al actualizar Form201: ${error.message}`, error.stack);
      throw error;
    }
  }

  async finalize(id: string, userId: string): Promise<Form201Entity> {
    this.logger.log(`[finalize] Finalizando Form201. id=${id}, userId=${userId}`);
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      if (form201.isFinalized) {
        this.logger.warn(`[finalize] Form201 ya estaba finalizado. id=${id}`);
        throw new BadRequestException('El formulario ya está finalizado.');
      }

      form201.isFinalized = true;
      await this.form201Repository.save(form201);

      // Registrar en bitácora de la emergencia
      const now = new Date();
      const user = await this.userService.findOne(userId);
      await this.actionRepository.save(
        this.actionRepository.create({
          description: `Formulario 201 finalizado (${form201.code})`,
          date: now,
          hour: `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes(),
          ).padStart(2, '0')}`,
          user,
          emergency: form201.emergency,
        }),
      );

      this.logger.log(`[finalize] Form201 finalizado exitosamente. id=${id}, code=${form201.code}`);
      return form201;
    } catch (error) {
      this.logger.error(`[finalize] Error al finalizar Form201: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`[delete] Eliminando Form201. id=${id}`);
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      await this.form201Repository.update(id, { isDeleted: true });
      this.logger.log(`[delete] Form201 eliminado exitosamente. id=${id}`);
    } catch (error) {
      this.logger.error(`[delete] Error al eliminar Form201: ${error.message}`, error.stack);
      throw error;
    }
  }
}
