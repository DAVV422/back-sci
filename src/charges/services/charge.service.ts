import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChargeDto } from '../dto/create-charge.dto';
import { UpdateChargeDto } from '../dto/update-charge.dto';
import { ChargeEntity } from '../entities/charges.entity';
import { handlerError } from '../../common/utils/handlerError.utils';

@Injectable()
export class ChargeService {
  private readonly logger = new Logger('ChargeService');

  constructor(
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
  ) {}

  public async findOne(id: string): Promise<ChargeEntity> {
    try {
      const charge: ChargeEntity = await this.chargeRepository.findOne({ where: { id } });
      if (!charge) throw new NotFoundException('Charge not found.');
      return charge;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(createChargeDto: CreateChargeDto): Promise<ChargeEntity> {
    try {
      const charge_created: ChargeEntity = await this.chargeRepository.save(createChargeDto);
      return await this.findOne(charge_created.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<{ statusCode: number; message: string }> {
    try {
      const charge = await this.findOne(id);
      const deletedCharge = await this.chargeRepository.delete(charge.id);
      if (deletedCharge.affected === 0) throw new BadRequestException('Charge not deleted.');
      return { statusCode: 200, message: 'Charge deleted.' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findAll(): Promise<ChargeEntity[]> {
    try {
      return await this.chargeRepository.find();
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(id: string, updateChargeDto: UpdateChargeDto): Promise<ChargeEntity> {
    try {
      const charge: ChargeEntity = await this.findOne(id);
      await this.chargeRepository.update(charge.id, updateChargeDto);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
