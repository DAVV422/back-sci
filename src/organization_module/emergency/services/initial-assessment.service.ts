import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateInitialAssessmentDto } from '../dto/create-initial-assessment.dto';
import { UpdateInitialAssessmentDto } from '../dto/update-initial-assessment.dto';
import { InitialAssessmentEntity } from '../entities/initial-assessment.entity';
import { EmergencyEntity } from '../entities/emergency.entity';
import { EmergencyStatus } from '../enums/emergency-status.enum';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { handlerError } from '../../../common/utils/handlerError.utils';
import { UserService } from '../../../user/services/user.service';

@Injectable()
export class InitialAssessmentService {
  private readonly logger = new Logger('InitialAssessmentService');

  constructor(
    @InjectRepository(InitialAssessmentEntity)
    private readonly assessmentRepository: Repository<InitialAssessmentEntity>,
    @InjectRepository(EmergencyEntity)
    private readonly emergencyRepository: Repository<EmergencyEntity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly userService: UserService,
  ) {}

  public async create(
    emergencyId: string,
    createAssessmentDto: CreateInitialAssessmentDto,
    userId: string,
  ): Promise<InitialAssessmentEntity> {
    try {
      const emergency = await this.findEmergencyForAssessment(emergencyId);
      if (emergency.initialAssessment)
        throw new BadRequestException(
          'Ya existe una evaluación inicial para esta emergencia. Use PATCH para modificarla.',
        );

      const user = await this.userService.findOne(userId);
      const assessment = this.assessmentRepository.create({
        ...createAssessmentDto,
      });
      const assessmentCreated = await this.assessmentRepository.save(
        assessment,
      );

      emergency.initialAssessment = assessmentCreated;
      await this.emergencyRepository.save(emergency);

      const now = new Date();
      await this.actionRepository.save(
        this.actionRepository.create({
          description: 'Evaluación Inicial registrada',
          date: now,
          hour: `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes(),
          ).padStart(2, '0')}`,
          user,
          emergency,
        }),
      );

      return assessmentCreated;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    emergencyId: string,
    updateAssessmentDto: UpdateInitialAssessmentDto,
  ): Promise<InitialAssessmentEntity> {
    try {
      const emergency = await this.findEmergencyForAssessment(emergencyId);
      if (!emergency.initialAssessment)
        throw new NotFoundException(
          'No existe una evaluación inicial para esta emergencia.',
        );

      await this.assessmentRepository.update(
        emergency.initialAssessment.id,
        updateAssessmentDto,
      );
      return await this.assessmentRepository.findOne({
        where: { id: emergency.initialAssessment.id },
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  private async findEmergencyForAssessment(
    emergencyId: string,
  ): Promise<EmergencyEntity> {
    const emergency = await this.emergencyRepository.findOne({
      where: { id: emergencyId },
      relations: ['initialAssessment'],
    });
    if (!emergency) throw new NotFoundException('Emergencia no encontrada.');
    if (
      emergency.state === EmergencyStatus.Finished ||
      emergency.state === EmergencyStatus.Canceled
    )
      throw new BadRequestException(
        'No se puede registrar la evaluación inicial en una emergencia finalizada o cancelada.',
      );
    return emergency;
  }
}
