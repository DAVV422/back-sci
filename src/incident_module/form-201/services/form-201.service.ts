import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateForm201Dto } from '../dto/create-form-201.dto';
import { UpdateForm201Dto } from '../dto/update-form-201.dto';
import { Form201Entity } from '../entities/form-201.entity';
import { EmergencyService } from '../../emergency/services/emergency.service';

@Injectable()
export class Form201Service {
  private readonly logger = new Logger('Form201Service');

  constructor(
    @InjectRepository(Form201Entity)
    private readonly form201Repository: Repository<Form201Entity>,
    private readonly emergencyService: EmergencyService
  ) { }

  async create(createForm201Dto: CreateForm201Dto): Promise<Form201Entity> {
    try {
      const { emergency, ...form201Create} = createForm201Dto;
      const emergencyEntity = await this.emergencyService.findOne(emergency);
      const form201Created: Form201Entity = await this.form201Repository.create({
        ...form201Create,
        emergency: {id: emergencyEntity.id}
      });
      return await this.form201Repository.save(form201Created);
    } catch (error) {
      this.logger.error(`Error creating Form201: ${error.message}`);
      throw new BadRequestException('Unable to create Form201.');
    }
  }

  async update(id: string, updateForm201Dto: UpdateForm201Dto): Promise<Form201Entity> {
    try {
      const form201: Form201Entity = await this.findOne(id);
      const {emergency, ... updateForm201} = updateForm201Dto;
      const form201Updated = await this.form201Repository.save({ ...form201, ...updateForm201 });
      return form201Updated;
    } catch (error) {
      this.logger.error(`Error updating Form201: ${error.message}`);
      throw new BadRequestException('Unable to update Form201.');
    }
  }

  async findByEmergency(emergencyId: string): Promise<Form201Entity[]> {
    try {
      const query = this.form201Repository.createQueryBuilder('form201');
      query.leftJoinAndSelect('form201.emergency','emergency');
      query.where('emergency.id = :id', {id: emergencyId});
      return await query.getMany();
      // this.form201Repository.find({ where: { emergency: { id: emergencyId } } });
    } catch (error) {
      this.logger.error(`Error finding Form201 by Emergency: ${error.message}`);
      throw new NotFoundException('Form201 not found.');
    }
  }

  async findOne(id: string): Promise<Form201Entity> {
    try {
      return await this.form201Repository.findOne({where: {id}});
    } catch (error) {
      this.logger.error(`Error finding Form201: ${error.message}`);
      throw new NotFoundException('Form201 not found.');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const form201: Form201Entity = await this.findOne(id);
      await this.form201Repository.remove(form201);
    } catch (error) {
      this.logger.error(`Error deleting Form201: ${error.message}`);
      throw new BadRequestException('Unable to delete Form201.');
    }
  }
}
