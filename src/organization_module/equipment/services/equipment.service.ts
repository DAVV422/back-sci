import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { EquipmentEntity } from '../entities/equipment.entity';
import { handlerError } from '../../../common/utils/handlerError.utils';
import { QueryDto } from '../../../common/dto/query.dto';
import {
  ApiResponse,
  PaginatedResult,
} from '../../../common/interfaces/responseMessage.interface';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger('EquipmentService');

  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepository: Repository<EquipmentEntity>,
  ) {}

  public async create(
    createEquipmentDto: CreateEquipmentDto,
  ): Promise<EquipmentEntity> {
    try {
      if (createEquipmentDto.availableQuantity > createEquipmentDto.totalQuantity)
        throw new BadRequestException(
          'La cantidad disponible no puede superar la cantidad total.',
        );
      const equipment_created =
        this.equipmentRepository.create(createEquipmentDto);
      await this.equipmentRepository.save(equipment_created);
      return equipment_created;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateEquipmentDto: UpdateEquipmentDto,
  ): Promise<EquipmentEntity> {
    try {
      const equipment = await this.findOne(id);
      // El stock disponible lo administran el despacho y la devolución de recursos:
      // no se acepta del cliente. Si cambia el total, el disponible se ajusta por la diferencia.
      const { availableQuantity: _ignored, totalQuantity, ...data } =
        updateEquipmentDto;
      const changes: Partial<EquipmentEntity> = { ...data };
      if (totalQuantity !== undefined && totalQuantity !== equipment.totalQuantity) {
        const deployed = equipment.totalQuantity - equipment.availableQuantity;
        if (totalQuantity < deployed)
          throw new BadRequestException(
            `La cantidad total no puede ser menor a las ${deployed} unidades actualmente despachadas.`,
          );
        changes.totalQuantity = totalQuantity;
        changes.availableQuantity = totalQuantity - deployed;
      }
      if (Object.keys(changes).length > 0)
        await this.equipmentRepository.update(id, changes);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findAll(
    queryDto: QueryDto,
  ): Promise<PaginatedResult<EquipmentEntity>> {
    try {
      const { limit, offset, order = 'DESC', attr, value } = queryDto;
      const query = this.equipmentRepository.createQueryBuilder('equipment');
      query.andWhere('equipment.is_deleted = false');
      query.orderBy('equipment.name', 'ASC');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      const [items, total] = await query.getManyAndCount();
      return { items, total };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<EquipmentEntity> {
    try {
      const equipment = await this.equipmentRepository.findOne({
        where: { id, isDeleted: false },
      });
      if (!equipment) throw new NotFoundException('Equipo no encontrado.');
      return equipment;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const equipment = await this.findOne(id);
      const deletedEquipment = await this.equipmentRepository.update(
        equipment.id,
        { isDeleted: true },
      );
      if (deletedEquipment.affected === 0)
        throw new BadRequestException('Equipo no eliminado.');
      return {
        success: true,
        statusCode: 200,
        message: 'Equipo eliminado.',
        data: null,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
