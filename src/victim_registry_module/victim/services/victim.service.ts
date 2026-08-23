import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VictimEntity } from '../entities/victim.entity';
import { CreateVictimDto } from '../dto/create-victim.dto';
import { UpdateVictimDto } from '../dto/update-victim.dto';

@Injectable()
export class VictimService {
  private readonly logger = new Logger('VictimService');

  constructor(
    @InjectRepository(VictimEntity)
    private readonly victimRepository: Repository<VictimEntity>,
  ) {}

  async create(createVictimDto: CreateVictimDto): Promise<VictimEntity> {
    this.logger.log(`[create] Iniciando creación de víctima. identifier=${createVictimDto.identifier ?? 'N/A'}, clientGeneratedId=${createVictimDto.clientGeneratedId ?? 'N/A'}`);

    if (createVictimDto.clientGeneratedId) {
      const existing = await this.victimRepository.findOne({
        where: { clientGeneratedId: createVictimDto.clientGeneratedId },
      });
      if (existing) {
        this.logger.warn(`[create] Idempotencia: víctima con clientGeneratedId=${createVictimDto.clientGeneratedId} ya existe. id=${existing.id}`);
        return existing;
      }
    }

    const victim = this.victimRepository.create(createVictimDto);
    const saved = await this.victimRepository.save(victim);
    this.logger.log(`[create] Víctima creada exitosamente. id=${saved.id}, identifier=${saved.identifier ?? 'N/A'}`);
    return saved;
  }

  async findOne(id: string): Promise<VictimEntity> {
    this.logger.log(`[findOne] Buscando víctima. id=${id}`);
    const victim = await this.victimRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!victim) {
      this.logger.warn(`[findOne] Víctima no encontrada. id=${id}`);
      throw new NotFoundException(`Víctima con ID ${id} no encontrada.`);
    }
    this.logger.log(`[findOne] Víctima encontrada. id=${victim.id}`);
    return victim;
  }

  async update(
    id: string,
    updateVictimDto: UpdateVictimDto,
  ): Promise<VictimEntity> {
    this.logger.log(`[update] Actualizando víctima. id=${id}`);
    const victim = await this.findOne(id);
    this.victimRepository.merge(victim, updateVictimDto);
    const saved = await this.victimRepository.save(victim);
    this.logger.log(`[update] Víctima actualizada exitosamente. id=${saved.id}`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`[remove] Eliminando (soft-delete) víctima. id=${id}`);
    const victim = await this.findOne(id);
    await this.victimRepository.update(victim.id, { isDeleted: true });
    this.logger.log(`[remove] Víctima eliminada. id=${victim.id}`);
  }
}
