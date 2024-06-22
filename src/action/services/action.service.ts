import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateActionDto } from '../dto/create-action.dto';
import { ActionEntity } from '../entities/action.entity';
import { handlerError } from '../../common/utils/handlerError.utils';
import { Form201Service } from 'src/form-201/services/form-201.service';

@Injectable()
export class ActionService {
  private readonly logger = new Logger('ActionService');

  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly form201Service: Form201Service
  ) { }

  public async findOne(id: string): Promise<ActionEntity> {
    try {
      const action: ActionEntity = await this.actionRepository.findOne({ where: { id }, relations:['form201'] });
      if (!action) throw new NotFoundException('Acción no encontrada.');
      return action;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(createActionDto: CreateActionDto): Promise<ActionEntity> {
    try {
      const { form201, ... createAction } = createActionDto;
      const form201Entity = await this.form201Service.findOne(form201);
      const action = await this.actionRepository.create({ ...createAction, form201: { id: form201Entity.id}});
      return await this.actionRepository.save(action);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(id: string, updateActionDto: CreateActionDto): Promise<ActionEntity> {
    try {
      const { form201, ...updateAction } = updateActionDto;
      const action = await this.findOne(id);
      await this.actionRepository.update(action.id, updateAction);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const action = await this.findOne(id);
      const deletedAction = await this.actionRepository.delete(action.id);
      if (deletedAction.affected === 0) throw new BadRequestException('Acción no eliminada.');
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByForm201(form201Id: string): Promise<ActionEntity[]> {
    try {
      return await this.actionRepository.find({ where: { form201: {id:form201Id} } });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
