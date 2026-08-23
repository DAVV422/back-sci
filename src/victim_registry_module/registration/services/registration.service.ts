import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationEntity } from '../entities/registration.entity';
import { CreateRegistrationDto } from '../dto/create-registration.dto';
import { Form207Service } from '../../form-207/services/form-207.service';
import { VictimService } from '../../victim/services/victim.service';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(RegistrationEntity)
    private readonly registrationRepository: Repository<RegistrationEntity>,
    private readonly form207Service: Form207Service,
    private readonly victimService: VictimService,
    private readonly emergencyService: EmergencyService,
    private readonly userService: UserService,
  ) {}

  async create(
    form207Id: string,
    createRegistrationDto: CreateRegistrationDto,
    userId: string,
  ): Promise<RegistrationEntity> {
    if (createRegistrationDto.clientGeneratedId) {
      const existing = await this.registrationRepository.findOne({
        where: { clientGeneratedId: createRegistrationDto.clientGeneratedId },
        relations: ['victim', 'form207', 'user'],
      });
      if (existing) {
        return existing;
      }
    }

    const form207 = await this.form207Service.findOne(form207Id);
    this.emergencyService.assertEditable(form207.emergency);

    if (form207.isFinalized) {
      throw new BadRequestException('El Formulario 207 ya está finalizado.');
    }

    const victim = await this.victimService.findOne(createRegistrationDto.victimId);
    const user = await this.userService.findOne(userId);

    const now = new Date();
    const hour = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const registration = this.registrationRepository.create({
      classification: createRegistrationDto.classification,
      transferredBy: createRegistrationDto.transferredBy,
      cellphoneTransferManager: createRegistrationDto.cellphoneTransferManager,
      notes: createRegistrationDto.notes,
      clientGeneratedId: createRegistrationDto.clientGeneratedId,
      date: now,
      hour,
      form207,
      victim,
      user,
    });

    return await this.registrationRepository.save(registration);
  }

  async findByForm207(form207Id: string): Promise<RegistrationEntity[]> {
    const form207 = await this.form207Service.findOne(form207Id);
    return await this.registrationRepository.find({
      where: { form207: { id: form207.id } },
      relations: ['victim', 'user'],
      order: { createdAt: 'ASC' },
    });
  }

  async findHistoryByVictim(victimId: string): Promise<RegistrationEntity[]> {
    const victim = await this.victimService.findOne(victimId);
    return await this.registrationRepository.find({
      where: { victim: { id: victim.id } },
      relations: ['form207', 'user'],
      order: { createdAt: 'DESC' },
    });
  }
}
