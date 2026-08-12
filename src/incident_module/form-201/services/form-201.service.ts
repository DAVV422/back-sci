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
    try {
      const emergencyEntity = await this.emergencyService.findOne(emergencyId);
      this.emergencyService.assertEditable(emergencyEntity);

      // Validar exclusividad del Formulario 201 activo
      const activeForm = await this.form201Repository.findOne({
        where: { emergency: { id: emergencyId }, isDeleted: false },
      });
      if (activeForm) {
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
        return await this.form201Repository.save(form201);
      } catch (error) {
        if (error?.code === '23505') {
          throw new ConflictException(
            'Ya existe un Formulario 201 activo para esta emergencia.',
          );
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error al crear Form201: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string): Promise<Form201Entity> {
    try {
      const form201 = await this.form201Repository.findOne({
        where: { id, isDeleted: false },
        relations: ['emergency', 'user'],
      });
      if (!form201) throw new NotFoundException('Formulario 201 no encontrado.');
      return form201;
    } catch (error) {
      this.logger.error(`Error al buscar Form201: ${error.message}`);
      throw error;
    }
  }

  async findActiveByEmergency(emergencyId: string): Promise<Form201Entity> {
    try {
      const form201 = await this.form201Repository.findOne({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['emergency', 'user'],
      });
      if (!form201) {
        throw new NotFoundException(
          'No se encontró un Formulario 201 activo para esta emergencia.',
        );
      }
      return form201;
    } catch (error) {
      this.logger.error(`Error al buscar Form201 por emergencia: ${error.message}`);
      throw error;
    }
  }

  async findByEmergency(emergencyId: string): Promise<Form201Entity[]> {
    try {
      return await this.form201Repository.find({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['emergency', 'user'],
      });
    } catch (error) {
      this.logger.error(`Error al listar Form201 por emergencia: ${error.message}`);
      throw error;
    }
  }

  async update(
    id: string,
    updateForm201Dto: UpdateForm201Dto,
  ): Promise<Form201Entity> {
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      if (form201.isFinalized) {
        throw new BadRequestException(
          'El formulario ya está finalizado y no se puede editar.',
        );
      }

      const { clientGeneratedId, code, isFinalized, ...updateData } = updateForm201Dto as any;
      await this.form201Repository.update(id, updateData);

      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Error al actualizar Form201: ${error.message}`);
      throw error;
    }
  }

  async finalize(id: string, userId: string): Promise<Form201Entity> {
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      if (form201.isFinalized) {
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

      return form201;
    } catch (error) {
      this.logger.error(`Error al finalizar Form201: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      await this.form201Repository.update(id, { isDeleted: true });
    } catch (error) {
      this.logger.error(`Error al eliminar Form201: ${error.message}`);
      throw error;
    }
  }
}
