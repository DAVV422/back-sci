import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationEntity } from '../entities/registration.entity';
import { CreateRegistrationDto } from '../dto/create-registration.dto';
import { UpdateRegistrationDto } from '../dto/update-registration.dto';

@Injectable()
export class RegistrationService {
    constructor(
        @InjectRepository(RegistrationEntity)
        private readonly registrationRepository: Repository<RegistrationEntity>,
    ) { }

    async create(createRegistrationDto: CreateRegistrationDto): Promise<RegistrationEntity> {
        const registration = this.registrationRepository.create(createRegistrationDto);
        return await this.registrationRepository.save(registration);
    }

    async findAll(): Promise<RegistrationEntity[]> {
        return await this.registrationRepository.find();
    }

    async findOne(id: string): Promise<RegistrationEntity> {
        const registration = await this.registrationRepository.findOne({ where: { id } });
        if (!registration) {
            throw new NotFoundException(`Registration with ID ${id} not found`);
        }
        return registration;
    }

    async update(id: string, updateRegistrationDto: UpdateRegistrationDto): Promise<RegistrationEntity> {
        const registration = await this.findOne(id);
        this.registrationRepository.merge(registration, updateRegistrationDto);
        return await this.registrationRepository.save(registration);
    }

    async remove(id: string): Promise<void> {
        const registration = await this.findOne(id);
        await this.registrationRepository.remove(registration);
    }
}
