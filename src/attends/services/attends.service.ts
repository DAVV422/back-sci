import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateAttendDto } from '../dto/create-attend.dto';
import { AttendEntity } from '../entities/attends.entity';
import { handlerError } from '../../common/utils/handlerError.utils';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';
import { UserService } from 'src/user/services/user.service';
import { EmergencyService } from 'src/emergency/services/emergency.service';
import { ChargeService } from 'src/charges/services/charge.service';

@Injectable()
export class AttendService {
  private readonly logger = new Logger('AttendService');

  constructor(
    @InjectRepository(AttendEntity)
    private readonly attendRepository: Repository<AttendEntity>,
    private readonly userService: UserService,
    private readonly emergencyService: EmergencyService,
    private readonly chargeService: ChargeService
  ) { }

  public async findOne(id: string): Promise<AttendEntity> {
    try {
      const attend: AttendEntity = await this.attendRepository.findOne({ where: { id }, relations: ['emergency', 'user', 'charge'] });
      if (!attend) throw new NotFoundException('Asistencia no encontrada.');
      return attend;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(createAttendDto: CreateAttendDto): Promise<AttendEntity> {
    try {
      const { user, emergency, charge, ...createAttend } = createAttendDto;
      const userEntity = await this.userService.findOne(user);
      const emergencyEntity = await this.emergencyService.findOne(emergency);
      const chargeEntity = await this.chargeService.findOne(charge);
      const attend_create: AttendEntity = this.attendRepository.create({
        ...createAttend,
        user: { id: userEntity.id },
        emergency: { id: emergencyEntity.id },
        charge: { id: chargeEntity.id}
      });
      const attend_created = await this.attendRepository.save(attend_create);
      return await this.findOne(attend_created.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ResponseMessage> {
    try {
      const attend = await this.findOne(id);
      const deletedAttend = await this.attendRepository.delete(attend.id);
      if (deletedAttend.affected === 0) throw new BadRequestException('Asistencia no eliminada.');
      return { statusCode: 200, message: 'Asistencia eliminada.' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEmergency(emergencyId: string): Promise<AttendEntity[]> {
    try {
      const attends: AttendEntity[] = await this.attendRepository.find({ where: { emergency: { id: emergencyId } }, relations: ['emergency', 'user', 'charge'] });
      if (!attends || attends.length === 0) throw new NotFoundException('No se encontraron asistencias para esta emergencia.');
      return attends;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByUser(userId: string): Promise<AttendEntity[]> {
    try {
      const attends: AttendEntity[] = await this.attendRepository.find({ where: { user: { id: userId } }, relations: ['emergency', 'user'] });
      if (!attends || attends.length === 0) throw new NotFoundException('No se encontraron asistencias para este usuario.');
      return attends;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
