import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateActionDto } from './../dto/create-action.dto';
import { CreateAudioDto } from './../dto/create-audio.dto';
import { ActionEntity } from './../entities/action.entity';
import { AudioEntity } from './../entities/audio.entity';
import { handlerError } from './../../../common/utils/handlerError.utils';
import { EmergencyService } from './../../../organization_module/emergency/services/emergency.service';
import { UserService } from './../../../user/services/user.service';

@Injectable()
export class ActionService {
  private readonly logger = new Logger('ActionService');

  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    @InjectRepository(AudioEntity)
    private readonly audioRepository: Repository<AudioEntity>,
    private readonly emergencyService: EmergencyService,
    private readonly userService: UserService,
  ) {}

  public async findOne(id: string): Promise<ActionEntity> {
    try {
      const action: ActionEntity = await this.actionRepository.findOne({
        where: { id, isDeleted: false },
        relations: ['emergency', 'user', 'audio'],
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
      // 1. Verificación de idempotencia offline
      if (createActionDto.clientGeneratedId) {
        const existing = await this.actionRepository.findOne({
          where: { clientGeneratedId: createActionDto.clientGeneratedId },
          relations: ['emergency', 'user', 'audio'],
        });
        if (existing) {
          this.logger.warn(
            `Acción con clientGeneratedId ${createActionDto.clientGeneratedId} ya procesada. Retornando existente.`,
          );
          return existing;
        }
      }

      const { emergency, audio, ...createAction } = createActionDto;
      const emergencyEntity = await this.emergencyService.findOne(emergency);
      this.emergencyService.assertEditable(emergencyEntity);
      const user = await this.userService.findOne(userId);

      let savedAudio: AudioEntity | undefined = undefined;

      if (audio) {
        const audioCreate = this.audioRepository.create({
          path_audio: audio.path_audio,
          duration: audio.duration ?? 0,
          processed: audio.processed ?? false,
          file_name: audio.file_name,
          mime_type: audio.mime_type,
          size_bytes: audio.size_bytes,
          transcription: audio.transcription,
          clientGeneratedId: audio.clientGeneratedId,
          emergency: emergencyEntity,
          user: user,
        });
        savedAudio = await this.audioRepository.save(audioCreate);
      }

      const action = this.actionRepository.create({
        ...createAction,
        emergency: { id: emergencyEntity.id },
        user: user,
        audio: savedAudio,
      });

      const savedAction = await this.actionRepository.save(action);
      return await this.findOne(savedAction.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async attachAudioToAction(
    actionId: string,
    createAudioDto: CreateAudioDto,
    userId: string,
  ): Promise<ActionEntity> {
    try {
      const action = await this.findOne(actionId);
      if (action.emergency) {
        this.emergencyService.assertEditable(action.emergency);
      }
      const user = await this.userService.findOne(userId);

      const audio = this.audioRepository.create({
        ...createAudioDto,
        emergency: action.emergency,
        user: user,
        action: action,
      });

      const savedAudio = await this.audioRepository.save(audio);
      action.audio = savedAudio;
      await this.actionRepository.save(action);

      return await this.findOne(action.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateActionDto: CreateActionDto,
  ): Promise<ActionEntity> {
    try {
      const { emergency, audio, ...updateAction } = updateActionDto;
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
        relations: ['emergency', 'user', 'audio'],
        order: { date: 'ASC', hour: 'ASC' },
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
