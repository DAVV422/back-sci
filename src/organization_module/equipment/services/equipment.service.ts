import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { EquipmentEntity } from '../entities/equipment.entity';
import { handlerError } from '../../common/utils/handlerError.utils';
import { QueryDto } from '../../common/dto/query.dto';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger('EquipmentService');

  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepository: Repository<EquipmentEntity>,
  ) { }

  public async create(createEquipmentDto: CreateEquipmentDto): Promise<EquipmentEntity> {
    try {
      const equipment_created = this.equipmentRepository.create(createEquipmentDto);
      await this.equipmentRepository.save(equipment_created);
      return equipment_created;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(id: string, updateEquipmentDto: UpdateEquipmentDto): Promise<EquipmentEntity> {
    try {
      const equipment = await this.findOne(id);
      await this.equipmentRepository.update(id, updateEquipmentDto);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findAll(queryDto: QueryDto): Promise<EquipmentEntity[]> {
    try {
      const { limit, offset, order = 'DESC', attr, value } = queryDto;
      const query = this.equipmentRepository.createQueryBuilder('equipment');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      return await query.getMany();
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<EquipmentEntity> {
    try {
      const equipment = await this.equipmentRepository.findOne({ where: { id } });
      if (!equipment) throw new NotFoundException('Equipo no encontrado.');
      return equipment;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ResponseMessage> {
    try {
      const equipment = await this.findOne(id);
      const deletedEquipment = await this.equipmentRepository.delete(equipment.id);
      if (deletedEquipment.affected === 0) throw new BadRequestException('Equipo no eliminado.');
      return { statusCode: 200, message: 'Equipo eliminado.' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
