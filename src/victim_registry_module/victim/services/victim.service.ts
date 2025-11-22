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
    ) { }

    async create(createVictimDto: CreateVictimDto): Promise<VictimEntity> {
        const victim = this.victimRepository.create(createVictimDto);
        return await this.victimRepository.save(victim);
    }

    async findAll(): Promise<VictimEntity[]> {
        return await this.victimRepository.find();
    }

    async findOne(id: string): Promise<VictimEntity> {
        const victim = await this.victimRepository.findOne({ where: { id } });
        if (!victim) {
            throw new NotFoundException(`Victim with ID ${id} not found`);
        }
        return victim;
    }

    async update(id: string, updateVictimDto: UpdateVictimDto): Promise<VictimEntity> {
        const victim = await this.findOne(id);
        this.victimRepository.merge(victim, updateVictimDto);
        return await this.victimRepository.save(victim);
    }

    async remove(id: string): Promise<void> {
        const victim = await this.findOne(id);
        await this.victimRepository.remove(victim);
    }
}
