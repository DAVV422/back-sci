import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { ResourceEntity } from '../entities/resource.entity';
import { handlerError } from '../../common/utils/handlerError.utils';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';
import { EmergencyService } from '../../emergency/services/emergency.service';
import { EquipmentService } from '../../equipment/services/equipment.service';

@Injectable()
export class ResourceService {
  private readonly logger = new Logger('ResourceService');

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,  
    private readonly emergencyService: EmergencyService,
    private readonly equipmentService: EquipmentService,
  ) {}

  public async findOne(id: string): Promise<ResourceEntity> {
    try {
      const resource = await this.resourceRepository.findOne({ where: { id }, relations: ['equipement', 'emergency'] });
      if (!resource) throw new NotFoundException('Resource not found.');
      return resource;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(createResourceDto: CreateResourceDto): Promise<ResourceEntity> {
    try {
      const { emergencyId, equipmentId , ...resourceData } = createResourceDto;
      const emergency = await this.emergencyService.findOne(emergencyId);
      if (!emergency) throw new NotFoundException('Emergency not found.');
      const equipment = await this.equipmentService.findOne(emergencyId);
      if (!emergency) throw new NotFoundException('Equipment not found.');
      const resource = this.resourceRepository.create({
        ...resourceData,
        emergency,
        equipment
      });

      return await this.resourceRepository.save(resource);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(id: string, updateResourceDto: UpdateResourceDto): Promise<ResourceEntity> {
    try {
      const resource = await this.findOne(id);
      const { emergencyId,  equipmentId, ...resourceData } = updateResourceDto;
      const resourceUpdated = await this.resourceRepository.update(resource.id, resourceData);
      if (resourceUpdated.affected === 0) throw new NotFoundException('Recurso no actualizado.');
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ResponseMessage> {
    try {
      const resource = await this.findOne(id);
      await this.resourceRepository.delete(resource.id);
      return { statusCode: 200, message: 'Resource deleted.' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEmergencyId(emergencyId: string): Promise<ResourceEntity[]> {
    try {
      const emergency = await this.emergencyService.findOne(emergencyId);
      if (!emergency) throw new NotFoundException('Emergency not found.');

      return await this.resourceRepository.find({ where: { emergency } });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEquipmentId(equipmentId: string): Promise<ResourceEntity[]> {
    try {
      const equipment = await this.equipmentService.findOne(equipmentId);
      if (!equipment) throw new NotFoundException('Equipment not found.');

      return await this.resourceRepository.find({ where: { equipment } });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
