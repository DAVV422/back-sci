import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VictimEntity } from '../entities/victim.entity';
import { CreateVictimDto } from '../dto/create-victim.dto';
import { UpdateVictimDto } from '../dto/update-victim.dto';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import {
  EmergencyAccessService,
  TRIAGE_REGISTRAR_CHARGES,
} from '../../../organization_module/emergency/services/emergency-access.service';
import { ROLES } from '../../../common/constants';

@Injectable()
export class VictimService {
  private readonly logger = new Logger('VictimService');

  constructor(
    @InjectRepository(VictimEntity)
    private readonly victimRepository: Repository<VictimEntity>,
    private readonly emergencyService: EmergencyService,
    private readonly emergencyAccessService: EmergencyAccessService,
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

  /** Detalle de una víctima aplicando la privacidad de datos de pacientes (decisión 18). */
  async findOneForUser(id: string, userId: string, userRole: string): Promise<VictimEntity> {
    const victim = await this.findOne(id);
    if (userRole?.toLowerCase() !== ROLES.BASIC) return victim;
    const emergency = await this.findLatestEmergency(id);
    if (!emergency) {
      throw new ForbiddenException('Los datos de pacientes solo son visibles para el personal que participó en la emergencia.');
    }
    await this.emergencyAccessService.assertCanViewPatients(emergency.id, userId, userRole);
    return victim;
  }

  async update(
    id: string,
    updateVictimDto: UpdateVictimDto,
    userId?: string,
    userRole?: string,
  ): Promise<VictimEntity> {
    this.logger.log(`[update] Actualizando víctima. id=${id}`);
    const victim = await this.findOne(id);
    if (userRole) await this.assertCanEdit(victim.id, userId, userRole);
    this.victimRepository.merge(victim, updateVictimDto);
    const saved = await this.victimRepository.save(victim);
    this.logger.log(`[update] Víctima actualizada exitosamente. id=${saved.id}`);
    return saved;
  }

  /**
   * Editar la filiación de un paciente: los mismos que pueden registrarlo (EACV, LUMED, CI,
   * manager+) en la emergencia de su último registro, y solo si esa emergencia sigue abierta.
   * Una víctima sin registros todavía (alta en curso) solo la corrige un manager+.
   */
  private async assertCanEdit(victimId: string, userId: string, userRole: string): Promise<void> {
    const emergency = await this.findLatestEmergency(victimId);
    if (!emergency) {
      if (this.emergencyAccessService.isManagerOrAbove(userRole)) return;
      throw new ForbiddenException('La víctima aún no tiene un registro de triage asociado a una emergencia.');
    }
    this.emergencyService.assertEditable(emergency);
    await this.emergencyAccessService.assertHasCharge(
      emergency.id,
      userId,
      userRole,
      TRIAGE_REGISTRAR_CHARGES,
      'Solo el Encargado del ACV, el Líder de la Unidad Médica, el Comandante del Incidente o un usuario con rol Manager o superior puede editar datos de pacientes.',
    );
  }

  /** Emergencia del registro de triage más reciente de la víctima (o null si aún no tiene). */
  private async findLatestEmergency(victimId: string): Promise<EmergencyEntity | null> {
    const victim = await this.victimRepository.findOne({
      where: { id: victimId, isDeleted: false },
      relations: ['registrations', 'registrations.form207', 'registrations.form207.emergency'],
    });
    const latest = [...(victim?.registrations ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    return latest?.form207?.emergency ?? null;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`[remove] Eliminando (soft-delete) víctima. id=${id}`);
    const victim = await this.findOne(id);
    await this.victimRepository.update(victim.id, { isDeleted: true });
    this.logger.log(`[remove] Víctima eliminada. id=${victim.id}`);
  }
}
