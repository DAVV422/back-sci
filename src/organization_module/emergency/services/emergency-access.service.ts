import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AttendEntity } from '../../attends/entities/attends.entity';
import { ROLES } from '../../../common/constants';

/**
 * Permisos tácticos dentro de una emergencia (docs/sistema/02_roles_y_reglas_de_negocio.md):
 * - Rol global `manager` o superior: acceso total.
 * - Personal asignado (attend activo): bitácora, triage y recursos.
 * - Cargos SCI específicos (CI, Líder de Unidad Médica): formularios.
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
    if (await this.hasActiveAttend(emergencyId, userId)) return;
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
    chargeSystemNames: string[],
    message: string,
  ): Promise<void> {
    if (this.isManagerOrAbove(userRole)) return;
    if (await this.hasActiveAttend(emergencyId, userId, chargeSystemNames)) return;
    this.logger.warn(
      `[assertHasCharge] Acceso denegado: userId=${userId}, role=${userRole} sin cargo [${chargeSystemNames.join(', ')}] en emergencia=${emergencyId}`,
    );
    throw new ForbiddenException(message);
  }

  private async hasActiveAttend(
    emergencyId: string,
    userId: string,
    chargeSystemNames?: string[],
  ): Promise<boolean> {
    const attend = await this.attendRepository.findOne({
      where: {
        emergency: { id: emergencyId },
        user: { id: userId },
        isActive: true,
        isDeleted: false,
        ...(chargeSystemNames?.length
          ? { chargeSystemName: In(chargeSystemNames) }
          : {}),
      },
    });
    return !!attend;
  }
}
