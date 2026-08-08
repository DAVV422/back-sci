import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { ResourceEntity } from '../entities/resource.entity';
import { EquipmentEntity } from '../../../organization_module/equipment/entities/equipment.entity';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { handlerError } from '../../../common/utils/handlerError.utils';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { EquipmentService } from '../../../organization_module/equipment/services/equipment.service';

@Injectable()
export class ResourceService {
  private readonly logger = new Logger('ResourceService');

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
    private readonly dataSource: DataSource,
    private readonly emergencyService: EmergencyService,
    private readonly equipmentService: EquipmentService,
  ) {}

  public async findOne(id: string): Promise<ResourceEntity> {
    try {
      const resource = await this.resourceRepository.findOne({
        where: { id, isDeleted: false },
        relations: ['equipment', 'emergency'],
      });
      if (!resource) throw new NotFoundException('Resource not found.');
      return resource;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(
    createResourceDto: CreateResourceDto,
    userId: string,
  ): Promise<ResourceEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const { emergencyId, equipmentId, amount, ...resourceData } =
        createResourceDto;
      const emergency = await this.emergencyService.findOne(emergencyId);
      if (!emergency) throw new NotFoundException('Emergency not found.');
      this.emergencyService.assertEditable(emergency);
      const equipment = await this.equipmentService.findOne(equipmentId);
      if (!equipment) throw new NotFoundException('Equipment not found.');
      if (amount > equipment.availableQuantity)
        throw new BadRequestException('Cantidad no disponible en inventario');

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const lockedEquipment = await queryRunner.manager.findOne(
          EquipmentEntity,
          {
            where: { id: equipment.id, isDeleted: false },
            lock: { mode: 'pessimistic_write' },
          },
        );
        if (!lockedEquipment)
          throw new NotFoundException('Equipment not found.');
        if (amount > lockedEquipment.availableQuantity)
          throw new BadRequestException('Cantidad no disponible en inventario');

        lockedEquipment.availableQuantity -= amount;
        await queryRunner.manager.save(lockedEquipment);

        const resource = queryRunner.manager.create(ResourceEntity, {
          ...resourceData,
          amount,
          emergency: { id: emergency.id },
          equipment: { id: equipment.id },
        });
        const savedResource = await queryRunner.manager.save(resource);

        const now = new Date();
        const action = queryRunner.manager.create(ActionEntity, {
          description: `Despacho de recurso: ${equipment.name} x${amount}`,
          date: now,
          hour: `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes(),
          ).padStart(2, '0')}`,
          user: { id: userId },
          emergency: { id: emergency.id },
        });
        await queryRunner.manager.save(action);

        await queryRunner.commitTransaction();
        return await this.findOne(savedResource.id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      handlerError(error, this.logger);
    } finally {
      if (queryRunner.isReleased === false) await queryRunner.release();
    }
  }

  public async returnResource(
    id: string,
    amountReturned: number,
    userId: string,
  ): Promise<ResourceEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const resource = await this.findOne(id);
      const pending = resource.amount - resource.amount_returned;
      if (amountReturned > pending)
        throw new BadRequestException('Cantidad a devolver excede lo asignado');

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const lockedEquipment = await queryRunner.manager.findOne(
          EquipmentEntity,
          {
            where: { id: resource.equipment.id, isDeleted: false },
            lock: { mode: 'pessimistic_write' },
          },
        );
        if (!lockedEquipment)
          throw new NotFoundException('Equipment not found.');
        if (
          lockedEquipment.availableQuantity + amountReturned >
          lockedEquipment.totalQuantity
        )
          throw new BadRequestException(
            'La devolución supera la cantidad total del equipo',
          );

        lockedEquipment.availableQuantity += amountReturned;
        await queryRunner.manager.save(lockedEquipment);

        resource.amount_returned += amountReturned;
        await queryRunner.manager.save(resource);

        const now = new Date();
        const action = queryRunner.manager.create(ActionEntity, {
          description: `Devolución de recurso: ${resource.equipment.name} x${amountReturned}`,
          date: now,
          hour: `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes(),
          ).padStart(2, '0')}`,
          user: { id: userId },
          emergency: { id: resource.emergency.id },
        });
        await queryRunner.manager.save(action);

        await queryRunner.commitTransaction();
        return await this.findOne(id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      handlerError(error, this.logger);
    } finally {
      if (queryRunner.isReleased === false) await queryRunner.release();
    }
  }

  public async update(
    id: string,
    updateResourceDto: UpdateResourceDto,
  ): Promise<ResourceEntity> {
    try {
      const resource = await this.findOne(id);
      if (resource.emergency)
        this.emergencyService.assertEditable(resource.emergency);
      const { emergencyId, equipmentId, ...resourceData } = updateResourceDto;
      const resourceUpdated = await this.resourceRepository.update(
        resource.id,
        resourceData,
      );
      if (resourceUpdated.affected === 0)
        throw new NotFoundException('Recurso no actualizado.');
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const resource = await this.findOne(id);
      await this.resourceRepository.update(resource.id, { isDeleted: true });
      return {
        success: true,
        statusCode: 200,
        message: 'Resource deleted.',
        data: null,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEmergencyId(
    emergencyId: string,
  ): Promise<ResourceEntity[]> {
    try {
      const emergency = await this.emergencyService.findOne(emergencyId);
      this.logger.debug(`Emergency ${emergency?.id} fetched for resources`);
      if (!emergency) throw new NotFoundException('Emergency not found.');
      return await this.resourceRepository.find({
        where: { emergency: { id: emergency.id }, isDeleted: false },
        relations: ['equipment', 'emergency'],
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEquipmentId(
    equipmentId: string,
  ): Promise<ResourceEntity[]> {
    try {
      const equipment = await this.equipmentService.findOne(equipmentId);
      if (!equipment) throw new NotFoundException('Equipment not found.');

      return await this.resourceRepository.find({
        where: { equipment, isDeleted: false },
        relations: ['equipment', 'emergency'],
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
