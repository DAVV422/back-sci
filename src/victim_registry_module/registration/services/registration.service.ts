import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationEntity } from '../entities/registration.entity';
import { CreateRegistrationDto } from '../dto/create-registration.dto';
import { Form207Service } from '../../form-207/services/form-207.service';
import { VictimService } from '../../victim/services/victim.service';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { HealthFacilityService } from '../../health-facility/services/health-facility.service';
import {
  EmergencyAccessService,
  TRIAGE_REGISTRAR_CHARGES,
} from '../../../organization_module/emergency/services/emergency-access.service';

export type TriageClassification = 'rojo' | 'amarillo' | 'verde' | 'negro';

export interface TriageSummary {
  total: number;
  rojo: number;
  amarillo: number;
  verde: number;
  negro: number;
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger('RegistrationService');

  constructor(
    @InjectRepository(RegistrationEntity)
    private readonly registrationRepository: Repository<RegistrationEntity>,
    private readonly form207Service: Form207Service,
    private readonly victimService: VictimService,
    private readonly emergencyService: EmergencyService,
    private readonly userService: UserService,
    private readonly emergencyAccessService: EmergencyAccessService,
    private readonly healthFacilityService: HealthFacilityService,
  ) {}

  async create(
    form207Id: string,
    createRegistrationDto: CreateRegistrationDto,
    userId: string,
    userRole?: string,
  ): Promise<RegistrationEntity> {
    this.logger.log(
      `[create] Iniciando registro de víctima en Form207. form207Id=${form207Id}, userId=${userId}, victimId=${createRegistrationDto.victimId}, clientGeneratedId=${createRegistrationDto.clientGeneratedId ?? 'N/A'}`,
    );

    // Idempotencia
    if (createRegistrationDto.clientGeneratedId) {
      const existing = await this.registrationRepository.findOne({
        where: { clientGeneratedId: createRegistrationDto.clientGeneratedId },
        relations: ['victim', 'form207', 'user'],
      });
      if (existing) {
        this.logger.warn(
          `[create] Idempotencia: registro con clientGeneratedId=${createRegistrationDto.clientGeneratedId} ya existe. id=${existing.id}`,
        );
        return existing;
      }
    }

    const form207 = await this.form207Service.findOne(form207Id);
    this.emergencyService.assertEditable(form207.emergency);

    if (userRole) {
      await this.emergencyAccessService.assertHasCharge(
        form207.emergency.id,
        userId,
        userRole,
        TRIAGE_REGISTRAR_CHARGES,
        'Solo el Encargado del ACV, el Líder de la Unidad Médica, el Comandante del Incidente o un usuario con rol Manager o superior puede registrar pacientes.',
      );
    }

    if (form207.isFinalized) {
      this.logger.warn(
        `[create] Form207 ya está finalizado. form207Id=${form207Id}`,
      );
      throw new BadRequestException('El Formulario 207 ya está finalizado.');
    }

    // Manual SCI: lugar de traslado (casilla 7) y medio (casilla 8) van juntos o no van.
    const destinationName = createRegistrationDto.transferDestination?.trim();
    if (!!destinationName !== !!createRegistrationDto.transportMeans) {
      throw new BadRequestException(
        'Indica el lugar y el medio de traslado juntos, o ninguno de los dos.',
      );
    }

    const victim = await this.victimService.findOne(createRegistrationDto.victimId);
    const user = await this.userService.findOne(userId);
    const transferDestination = destinationName
      ? await this.healthFacilityService.findOrCreate(destinationName)
      : null;

    const now = new Date();
    const hour = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const registration = this.registrationRepository.create({
      classification: createRegistrationDto.classification,
      transferredBy: createRegistrationDto.transferredBy,
      transportMeans: createRegistrationDto.transportMeans ?? null,
      transferDestination,
      cellphoneTransferManager: createRegistrationDto.cellphoneTransferManager,
      notes: createRegistrationDto.notes,
      clientGeneratedId: createRegistrationDto.clientGeneratedId,
      date: now,
      hour,
      form207,
      victim,
      user,
    });

    try {
      const saved = await this.registrationRepository.save(registration);
      this.logger.log(
        `[create] Registro de víctima creado exitosamente. id=${saved.id}, victimId=${victim.id}, form207Id=${form207Id}`,
      );
      return saved;
    } catch (error) {
      this.logger.error(
        `[create] Error al guardar registro. form207Id=${form207Id}, victimId=${createRegistrationDto.victimId}. Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByForm207(
    form207Id: string,
    userId?: string,
    userRole?: string,
  ): Promise<RegistrationEntity[]> {
    this.logger.log(`[findByForm207] Buscando registros. form207Id=${form207Id}`);
    const form207 = await this.form207Service.findOne(form207Id);
    if (userRole) {
      await this.emergencyAccessService.assertCanViewPatients(form207.emergency.id, userId, userRole);
    }
    const results = await this.registrationRepository.find({
      where: { form207: { id: form207.id } },
      relations: ['victim', 'user', 'transferDestination'],
      order: { createdAt: 'ASC' },
    });
    this.logger.log(`[findByForm207] Encontrados ${results.length} registros. form207Id=${form207Id}`);
    return results;
  }

  async findHistoryByVictim(
    victimId: string,
    userId?: string,
    userRole?: string,
  ): Promise<RegistrationEntity[]> {
    this.logger.log(`[findHistoryByVictim] Buscando historial. victimId=${victimId}`);
    const victim = await this.victimService.findOne(victimId);
    const results = await this.registrationRepository.find({
      where: { victim: { id: victim.id } },
      relations: ['form207', 'form207.emergency', 'user', 'transferDestination'],
      order: { createdAt: 'DESC' },
    });
    if (userRole) {
      // El historial puede cruzar emergencias: se exige acceso a todas las involucradas.
      const emergencyIds = [...new Set(results.map((r) => r.form207?.emergency?.id).filter(Boolean))];
      for (const emergencyId of emergencyIds) {
        await this.emergencyAccessService.assertCanViewPatients(emergencyId, userId, userRole);
      }
    }
    this.logger.log(`[findHistoryByVictim] Historial encontrado. victimId=${victimId}, registros=${results.length}`);
    return results;
  }

  /**
   * Conteo de víctimas de la emergencia según su clasificación de triage MÁS RECIENTE
   * (una víctima re-evaluada de rojo a amarillo cuenta solo como amarillo).
   */
  async getTriageSummaryByEmergency(emergencyId: string): Promise<TriageSummary> {
    this.logger.log(`[getTriageSummaryByEmergency] Calculando resumen. emergencyId=${emergencyId}`);
    const emergency = await this.emergencyService.findOne(emergencyId);
    const rows: { classification: TriageClassification; count: string }[] =
      await this.registrationRepository.query(
        `SELECT latest.classification, COUNT(*) AS count
           FROM (
             SELECT DISTINCT ON (r.victim_id) r.victim_id, r.classification
               FROM registration r
               JOIN form207 f ON f.id = r.form207_id
               JOIN victim v ON v.id = r.victim_id
              WHERE f.emergency_id = $1
                AND f.is_deleted = false
                AND v.is_deleted = false
              ORDER BY r.victim_id, r.created_at DESC
           ) latest
          GROUP BY latest.classification`,
        [emergency.id],
      );

    const summary: TriageSummary = { total: 0, rojo: 0, amarillo: 0, verde: 0, negro: 0 };
    for (const row of rows) {
      const count = Number(row.count);
      summary[row.classification] = count;
      summary.total += count;
    }
    return summary;
  }
}
