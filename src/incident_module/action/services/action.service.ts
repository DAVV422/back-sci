import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateActionDto } from './../dto/create-action.dto';
import { ActionEntity } from './../entities/action.entity';
import { handlerError } from './../../../common/utils/handlerError.utils';
import { EmergencyService } from './../../../organization_module/emergency/services/emergency.service';
import { UserService } from './../../../user/services/user.service';

@Injectable()
export class ActionService {
  private readonly logger = new Logger('ActionService');

  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly emergencyService: EmergencyService,
    private readonly userService: UserService,
  ) {}

  public async findOne(id: string): Promise<ActionEntity> {
    try {
      const action: ActionEntity = await this.actionRepository.findOne({
        where: { id, isDeleted: false },
        relations: ['emergency'],
      });
      if (!action) throw new NotFoundException('Acción no encontrada.');
      return action;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(
    createActionDto: CreateActionDto,
    userId: string,
  ): Promise<ActionEntity> {
    try {
      const { emergency, ...createAction } = createActionDto;
      const emergencyEntity = await this.emergencyService.findOne(emergency);
      this.emergencyService.assertEditable(emergencyEntity);
      const user = await this.userService.findOne(userId);
      const action = await this.actionRepository.create({
        ...createAction,
        emergency: { id: emergencyEntity.id },
        user: user,
      });
      return await this.actionRepository.save(action);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateActionDto: CreateActionDto,
  ): Promise<ActionEntity> {
    try {
      const { emergency, ...updateAction } = updateActionDto;
      const action = await this.findOne(id);
      if (action.emergency)
        this.emergencyService.assertEditable(action.emergency);
      await this.actionRepository.update(action.id, updateAction);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const action = await this.findOne(id);
      if (action.emergency)
        this.emergencyService.assertEditable(action.emergency);
      const deletedAction = await this.actionRepository.update(action.id, {
        isDeleted: true,
      });
      if (deletedAction.affected === 0)
        throw new BadRequestException('Acción no eliminada.');
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEmergency(emergencyId: string): Promise<ActionEntity[]> {
    try {
      return await this.actionRepository.find({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['emergency'],
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
