import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateEmergencyDto } from '../dto/create-emergency.dto';
import { UpdateEmergencyDto } from '../dto/update-emergency.dto';
import { EmergencyEntity } from '../entities/emergency.entity';
import { handlerError } from '../../common/utils/handlerError.utils';
import { QueryDto } from '../../common/dto/query.dto';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';
import { UserService } from 'src/user/services/user.service';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger('EmergencyService');

  constructor(
    @InjectRepository(EmergencyEntity)
    private readonly emergencyRepository: Repository<EmergencyEntity>,
    private readonly userService: UserService
  ) { }

  public async findAll(queryDto: QueryDto): Promise<EmergencyEntity[]> {
    try {
      const { limit, offset, order = 'DESC', attr, value } = queryDto;
      const query = this.emergencyRepository.createQueryBuilder('emergency');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      query.orderBy('emergency.date', order.toLocaleUpperCase() as any);
      if (attr && value) query.where(`emergency.${attr} ILIKE :value`, { value: `%${value}%` });
      return await query.getMany();
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(createEmergencyDto: CreateEmergencyDto): Promise<EmergencyEntity> {
    try {
      const { user_id, ...createEmergency} = createEmergencyDto;
      const userEntity = await this.userService.findOne(user_id);
      const emergency_create: EmergencyEntity = await this.emergencyRepository.create({
        ...createEmergency, 
        user: { id: userEntity.id }      
      });
      const emergency_created = await this.emergencyRepository.save(emergency_create);
      return await this.findOne(emergency_created.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<EmergencyEntity> {
    try {
      const emergency: EmergencyEntity = await this.emergencyRepository.findOne({ where: { id } });
      if (!emergency) throw new NotFoundException('Emergencia no encontrada.');
      return emergency;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(id: string, updateEmergencyDto: UpdateEmergencyDto): Promise<EmergencyEntity> {
    try {
      const emergency: EmergencyEntity = await this.findOne(id);
      const { user_id, ...updateEmergency } = updateEmergencyDto;
      const emergencyUpdated = await this.emergencyRepository.update(emergency.id, updateEmergency);
      if (emergencyUpdated.affected === 0) throw new NotFoundException('Emergencia no actualizada.');
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ResponseMessage> {
    try {
      const emergency = await this.findOne(id);
      const deletedEmergency = await this.emergencyRepository.delete(emergency.id);
      if (deletedEmergency.affected === 0) throw new BadRequestException('Emergencia no eliminada.');
      return { statusCode: 200, message: 'Emergencia eliminada.' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
