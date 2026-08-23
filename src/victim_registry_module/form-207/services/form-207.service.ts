import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Form207Entity } from './../entities/form-207.entity';
import { CreateForm207Dto } from './../dto/create-form-207.dto';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { UserEntity } from '../../../user/entities/user.entity';

@Injectable()
export class Form207Service {
  constructor(
    @InjectRepository(Form207Entity)
    private readonly form207Repository: Repository<Form207Entity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly emergencyService: EmergencyService,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    emergencyId: string,
    createForm207Dto: CreateForm207Dto,
    userId: string,
  ): Promise<Form207Entity> {
    if (createForm207Dto.clientGeneratedId) {
      const existing = await this.form207Repository.findOne({
        where: { clientGeneratedId: createForm207Dto.clientGeneratedId },
        relations: ['user', 'emergency'],
      });
      if (existing) {
        return existing;
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const emergency = await queryRunner.manager.findOne(EmergencyEntity, {
        where: { id: emergencyId, isDeleted: false },
      });
      if (!emergency) {
        throw new NotFoundException('Emergencia no encontrada.');
      }
      this.emergencyService.assertEditable(emergency);

      // Atomic counter increment
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
        throw new NotFoundException('Usuario no encontrado.');
      }

      const form207 = queryRunner.manager.create(Form207Entity, {
        ...createForm207Dto,
        code,
        emergency,
        user,
      });

      const savedForm = await queryRunner.manager.save(Form207Entity, form207);
      await queryRunner.commitTransaction();
      return savedForm;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByEmergency(emergencyId: string): Promise<Form207Entity[]> {
    const emergency = await this.emergencyService.findOne(emergencyId);
    return await this.form207Repository.find({
      where: { emergency: { id: emergency.id }, isDeleted: false },
      relations: ['user', 'emergency'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Form207Entity> {
    const form207 = await this.form207Repository.findOne({
      where: { id, isDeleted: false },
      relations: ['emergency', 'user'],
    });
    if (!form207) {
      throw new NotFoundException(`Formulario 207 con ID ${id} no encontrado.`);
    }
    return form207;
  }

  async finalize(id: string, userId: string): Promise<Form207Entity> {
    const form207 = await this.findOne(id);
    this.emergencyService.assertEditable(form207.emergency);

    if (form207.isFinalized) {
      throw new BadRequestException('El formulario ya está finalizado.');
    }

    form207.isFinalized = true;
    const savedForm = await this.form207Repository.save(form207);

    // Guardar acción en bitácora
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

    return savedForm;
  }
}
