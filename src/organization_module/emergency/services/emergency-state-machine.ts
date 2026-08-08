import { BadRequestException, Injectable } from '@nestjs/common';
import { EmergencyStatus } from '../enums/emergency-status.enum';

const TRANSITIONS: Record<EmergencyStatus, EmergencyStatus[]> = {
  [EmergencyStatus.Pending]: [EmergencyStatus.Active, EmergencyStatus.Canceled],
  [EmergencyStatus.Active]: [
    EmergencyStatus.Finished,
    EmergencyStatus.Canceled,
  ],
  [EmergencyStatus.Finished]: [EmergencyStatus.Active],
  [EmergencyStatus.Canceled]: [],
};

@Injectable()
export class EmergencyStateMachine {
  public canTransition(from: EmergencyStatus, to: EmergencyStatus): boolean {
    return (TRANSITIONS[from] ?? []).includes(to);
  }

  public validTargets(from: EmergencyStatus): EmergencyStatus[] {
    return TRANSITIONS[from] ?? [];
  }

  public assertTransition(from: EmergencyStatus, to: EmergencyStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Transición de '${from}' a '${to}' no permitida. Transiciones válidas desde '${from}': [${this.validTargets(
          from,
        ).join(', ')}]`,
      );
    }
  }
}
