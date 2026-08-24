import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handlerError } from '../../../common/utils/handlerError.utils';
import { QueryDto } from '../../../common/dto/query.dto';
import {
  ApiResponse,
  PaginatedResult,
} from '../../../common/interfaces/responseMessage.interface';
import { DataFireEntity } from './../entities/dataFires.entity';
import { EmergencyService } from './emergency.service';
import { CreateDataFireDto } from '../dto/create-data-fire.dto';
import { UpdateDataFireDto } from '../dto/update-data-fire.dto';

@Injectable()
export class DataFireService {
  private readonly logger = new Logger('DataFireService');

  constructor(
    @InjectRepository(DataFireEntity)
    private readonly dataFireRepository: Repository<DataFireEntity>,
    private readonly emergencyService: EmergencyService,
  ) {}

  public async findAll(
    queryDto: QueryDto,
  ): Promise<PaginatedResult<DataFireEntity>> {
    try {
      const { limit, offset } = queryDto;
      const query = this.dataFireRepository.createQueryBuilder('dataFire');
      query.andWhere('dataFire.is_deleted = false');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      const [items, total] = await query.getManyAndCount();
      return { items, total };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(
    createDataFireDto: CreateDataFireDto,
  ): Promise<DataFireEntity> {
    try {
      const { emergency, ...createDataFire } = createDataFireDto;
      const emergencyData = await this.emergencyService.findOne(emergency);
      const data_fire_create: DataFireEntity =
        await this.dataFireRepository.create({
          ...createDataFire,
          emergency: emergencyData,
        });
      const data_fire_created = await this.dataFireRepository.save(
        data_fire_create,
      );
      return await this.findOne(data_fire_created.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEmergencyId(
    emergencyId: string,
  ): Promise<DataFireEntity[]> {
    try {
      const dataFires: DataFireEntity[] = await this.dataFireRepository.find({
        where: { emergency: { id: emergencyId }, isDeleted: false },
      });
      if (!dataFires || dataFires.length === 0)
        throw new NotFoundException(
          'No se encontraron datos de incendio para esta emergencia.',
        );
      return dataFires;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<DataFireEntity> {
    try {
      const dataFire: DataFireEntity = await this.dataFireRepository.findOne({
        where: { id, isDeleted: false },
      });
      if (!dataFire)
        throw new NotFoundException('Datos de incendio no encontrado.');
      return dataFire;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateDataFireDto: UpdateDataFireDto,
  ): Promise<DataFireEntity> {
    try {
      const dataFire: DataFireEntity = await this.findOne(id);
      const { emergency, ...updateDataFire } = updateDataFireDto;
      const dataFireUpdated = await this.dataFireRepository.update(
        dataFire.id,
        updateDataFire,
      );
      if (dataFireUpdated.affected === 0)
        throw new NotFoundException('Datos de incendio no actualizado.');
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const dataFire = await this.findOne(id);
      const deletedEmergency = await this.dataFireRepository.update(
        dataFire.id,
        { isDeleted: true },
      );
      if (deletedEmergency.affected === 0)
        throw new BadRequestException('Datos de incendio no eliminado.');
      return {
        success: true,
        statusCode: 200,
        message: 'Datos de incendio eliminado.',
        data: null,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
