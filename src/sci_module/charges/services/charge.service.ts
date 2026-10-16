import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChargeDto } from '../dto/create-charge.dto';
import { UpdateChargeDto } from '../dto/update-charge.dto';
import { ChargeEntity } from '../entities/charges.entity';
import { handlerError } from '../../../common/utils/handlerError.utils';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { AttendEntity } from '../../../organization_module/attends/entities/attends.entity';
import { catalogDefinitionFor, isRetiredChargeName } from '../sci-charge-catalog';

@Injectable()
export class ChargeService {
  private readonly logger = new Logger('ChargeService');

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
  ) {}

  public async findOne(id: string): Promise<ChargeEntity> {
    try {
      const charge: ChargeEntity = await this.chargeRepository.findOne({
        where: { id, isDeleted: false },
      });
      if (!charge) throw new NotFoundException('Charge not found.');
      return charge;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByName(name: string): Promise<ChargeEntity> {
    try {
      const charge: ChargeEntity = await this.chargeRepository
        .createQueryBuilder('charge')
        .where('LOWER(charge.name) = LOWER(:name)', { name })
        .andWhere('charge.isDeleted = false')
        .getOne();
      if (!charge) throw new NotFoundException('Charge not found.');
      return charge;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(createChargeDto: CreateChargeDto): Promise<ChargeEntity> {
    try {
      // Se guarda tal cual (sin pasar a minúsculas): las búsquedas por nombre ya no distinguen mayúsculas.
      createChargeDto.name = createChargeDto.name.trim();
      this.assertCustomCharge(createChargeDto);
      await this.assertNameAvailable(createChargeDto.name);
      const charge_created: ChargeEntity = await this.chargeRepository.save(
        createChargeDto,
      );
      return await this.findOne(charge_created.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const charge = await this.findOne(id);
      this.assertEditable(charge);
      const inUse = await this.chargeRepository.manager.getRepository(AttendEntity).count({
        where: { charge: { id: charge.id }, isActive: true, isDeleted: false },
      });
      if (inUse > 0) {
        throw new BadRequestException(
          `El cargo "${charge.name}" tiene ${inUse} asignación(es) activa(s): libéralas antes de eliminarlo.`,
        );
      }
      const deletedCharge = await this.chargeRepository.update(charge.id, {
        isDeleted: true,
      });
      if (deletedCharge.affected === 0)
        throw new BadRequestException('Charge not deleted.');
      return {
        success: true,
        statusCode: 200,
        message: 'Charge deleted.',
        data: null,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findAll(): Promise<ChargeEntity[]> {
    try {
      const charges = await this.chargeRepository.find({
        where: { isDeleted: false },
        order: { level: 'ASC', weight: 'ASC' },
      });
      for (const charge of charges) charge.isCatalog = !!catalogDefinitionFor(charge);
      return charges;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateChargeDto: UpdateChargeDto,
  ): Promise<ChargeEntity> {
    try {
      const charge: ChargeEntity = await this.findOne(id);
      this.assertEditable(charge);
      if (updateChargeDto.name) {
        updateChargeDto.name = updateChargeDto.name.trim();
        await this.assertNameAvailable(updateChargeDto.name, charge.id);
      }
      this.assertCustomCharge(updateChargeDto);
      await this.chargeRepository.update(charge.id, updateChargeDto);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /** Los cargos del manual los mantiene la sincronización: un cambio manual se revertiría. */
  private assertEditable(charge: ChargeEntity): void {
    if (catalogDefinitionFor(charge)) {
      throw new BadRequestException(
        `"${charge.name}" es un cargo del Manual SCI: no se edita ni se elimina desde aquí.`,
      );
    }
  }

  /** Un cargo propio no puede usar el nombre ni la clave de uno del manual (ni un nombre retirado). */
  private assertCustomCharge(dto: { name?: string; systemName?: string }): void {
    const def = catalogDefinitionFor({ name: dto.name, systemName: dto.systemName });
    if (def) {
      throw new BadRequestException(`Ya existe en el Manual SCI como "${def.name}".`);
    }
    if (dto.name && isRetiredChargeName(dto.name)) {
      throw new BadRequestException(
        `"${dto.name}" no es un cargo del SCI: asigna a esa persona como integrante de un equipo o recurso simple.`,
      );
    }
  }

  private async assertNameAvailable(name: string, exceptId?: string): Promise<void> {
    const existing = await this.chargeRepository
      .createQueryBuilder('charge')
      .where('LOWER(charge.name) = LOWER(:name)', { name })
      .andWhere('charge.isDeleted = false')
      .getOne();
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException(`Ya existe un cargo llamado "${existing.name}".`);
    }
  }

  async countCharges(): Promise<number> {
    return await this.chargeRepository.count({
      where: { isDeleted: false },
    });
  }
}
