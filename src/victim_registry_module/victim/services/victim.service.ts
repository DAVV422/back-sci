import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VictimEntity } from '../entities/victim.entity';
import { CreateVictimDto } from '../dto/create-victim.dto';
import { UpdateVictimDto } from '../dto/update-victim.dto';

@Injectable()
export class VictimService {
  constructor(
    @InjectRepository(VictimEntity)
    private readonly victimRepository: Repository<VictimEntity>,
  ) {}

  async create(createVictimDto: CreateVictimDto): Promise<VictimEntity> {
    const victim = this.victimRepository.create(createVictimDto);
    return await this.victimRepository.save(victim);
  }

  async findOne(id: string): Promise<VictimEntity> {
    const victim = await this.victimRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!victim) {
      throw new NotFoundException(`Víctima con ID ${id} no encontrada.`);
    }
    return victim;
  }

  async update(
    id: string,
    updateVictimDto: UpdateVictimDto,
  ): Promise<VictimEntity> {
    const victim = await this.findOne(id);
    this.victimRepository.merge(victim, updateVictimDto);
    return await this.victimRepository.save(victim);
  }

  async remove(id: string): Promise<void> {
    const victim = await this.findOne(id);
    await this.victimRepository.update(victim.id, { isDeleted: true });
  }
}
