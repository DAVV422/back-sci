import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AttendEntity } from '../../attends/entities/attends.entity';
import { ROLES } from '../../../common/constants';

/** Cargos SCI (systemName) con facultades especiales dentro de una emergencia. */
export const SCI_CHARGE = {
  INCIDENT_COMMANDER: 'incident_commander',
  MEDICAL_UNIT_LEADER: 'medical_unit_leader',
  /** Encargado del Área de Concentración de Víctimas (EACV). */
  CASUALTY_AREA_MANAGER: 'casualty_area_manager',
} as const;

/** Crear y finalizar planillas SCI-207: CI y Líder de la Unidad Médica. */
export const FORM207_MANAGER_CHARGES = [
  SCI_CHARGE.INCIDENT_COMMANDER,
  SCI_CHARGE.MEDICAL_UNIT_LEADER,
];

/** Registrar y editar pacientes del SCI-207 (decisión 26): los encargados (EACV, LUMED) y el CI. */
export const TRIAGE_REGISTRAR_CHARGES = [
  SCI_CHARGE.INCIDENT_COMMANDER,
  SCI_CHARGE.MEDICAL_UNIT_LEADER,
  SCI_CHARGE.CASUALTY_AREA_MANAGER,
];

/**
 * Permisos tácticos dentro de una emergencia (docs-sci/05_reglas_y_roles.md):
 * - Rol global `manager` o superior: acceso total.
 * - Personal asignado (attend activo): bitácora y despacho de recursos.
 * - Cargos SCI específicos: mando (CI), formularios (CI, LUMED) y pacientes (EACV, LUMED, CI).
 * - Datos de pacientes: un `basic` solo los ve si participó en la emergencia (decisión 18).
 */
@Injectable()
export class EmergencyAccessService {
  private readonly logger = new Logger('EmergencyAccessService');

  constructor(
    @InjectRepository(AttendEntity)
    private readonly attendRepository: Repository<AttendEntity>,
  ) {}

  public isManagerOrAbove(userRole?: string): boolean {
    const role = userRole?.toLowerCase();
    return (
      role === ROLES.MANAGER || role === ROLES.ADMIN || role === ROLES.SUADMIN
    );
  }

  /** Exige rol manager+ o una asignación activa en la emergencia. */
  public async assertMember(
    emergencyId: string,
    userId: string,
    userRole: string,
    message = 'Solo el personal asignado a la emergencia o un usuario con rol Manager o superior puede realizar esta acción.',
  ): Promise<void> {
    if (this.isManagerOrAbove(userRole)) return;
    if (await this.hasAttend(emergencyId, userId, { activeOnly: true })) return;
    this.logger.warn(
      `[assertMember] Acceso denegado: userId=${userId}, role=${userRole} no asignado a emergencia=${emergencyId}`,
    );
    throw new ForbiddenException(message);
  }

  /** Exige rol manager+ o una asignación activa con alguno de los cargos indicados. */
  public async assertHasCharge(
    emergencyId: string,
    userId: string,
    userRole: string,
    chargeSystemNames: readonly string[],
    message: string,
  ): Promise<void> {
    if (this.isManagerOrAbove(userRole)) return;
    if (
      await this.hasAttend(emergencyId, userId, {
        activeOnly: true,
        chargeSystemNames,
      })
    )
      return;
    this.logger.warn(
      `[assertHasCharge] Acceso denegado: userId=${userId}, role=${userRole} sin cargo [${chargeSystemNames.join(', ')}] en emergencia=${emergencyId}`,
    );
    throw new ForbiddenException(message);
  }

  /** Mando de la emergencia (estado, datos generales, correcciones): CI activo o manager+. */
  public async assertCommanderOrManager(
    emergencyId: string,
    userId: string,
    userRole: string,
    message = 'Solo el Comandante del Incidente o un usuario con rol Manager o superior puede realizar esta acción.',
  ): Promise<void> {
    await this.assertHasCharge(
      emergencyId,
      userId,
      userRole,
      [SCI_CHARGE.INCIDENT_COMMANDER],
      message,
    );
  }

  /**
   * Lectura de datos de pacientes (SCI-207, víctimas e historial de triage).
   * Solo se restringe al rol `basic`: puede ver los de una emergencia en la que participó,
   * aunque su asignación ya no esté activa (decisión 18).
   */
  public async assertCanViewPatients(
    emergencyId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    if (userRole?.toLowerCase() !== ROLES.BASIC) return;
    if (await this.hasAttend(emergencyId, userId, { activeOnly: false })) return;
    this.logger.warn(
      `[assertCanViewPatients] Acceso denegado: userId=${userId} (basic) no participó en emergencia=${emergencyId}`,
    );
    throw new ForbiddenException(
      'Los datos de pacientes solo son visibles para el personal que participó en la emergencia.',
    );
  }

  private async hasAttend(
    emergencyId: string,
    userId: string,
    options: { activeOnly: boolean; chargeSystemNames?: readonly string[] },
  ): Promise<boolean> {
    const attend = await this.attendRepository.findOne({
      where: {
        emergency: { id: emergencyId },
        user: { id: userId },
        isDeleted: false,
        ...(options.activeOnly ? { isActive: true } : {}),
        ...(options.chargeSystemNames?.length
          ? { chargeSystemName: In([...options.chargeSystemNames]) }
          : {}),
      },
    });
    return !!attend;
  }
}
