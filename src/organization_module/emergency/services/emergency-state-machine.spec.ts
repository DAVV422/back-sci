import { BadRequestException } from '@nestjs/common';

import { EmergencyStateMachine } from './emergency-state-machine';
import { EmergencyStatus } from '../enums/emergency-status.enum';

describe('EmergencyStateMachine', () => {
  let machine: EmergencyStateMachine;

  beforeEach(() => {
    machine = new EmergencyStateMachine();
  });

  it('permite p → a y p → c', () => {
    expect(machine.canTransition(EmergencyStatus.Pending, EmergencyStatus.Active)).toBe(true);
    expect(machine.canTransition(EmergencyStatus.Pending, EmergencyStatus.Canceled)).toBe(true);
  });

  it('rechaza p → f', () => {
    expect(machine.canTransition(EmergencyStatus.Pending, EmergencyStatus.Finished)).toBe(false);
  });

  it('permite a → f y a → c', () => {
    expect(machine.canTransition(EmergencyStatus.Active, EmergencyStatus.Finished)).toBe(true);
    expect(machine.canTransition(EmergencyStatus.Active, EmergencyStatus.Canceled)).toBe(true);
  });

  it('permite f → a solo (MANAGER se valida en el servicio)', () => {
    expect(machine.canTransition(EmergencyStatus.Finished, EmergencyStatus.Active)).toBe(true);
  });

  it('rechaza f → c', () => {
    expect(machine.canTransition(EmergencyStatus.Finished, EmergencyStatus.Canceled)).toBe(false);
  });

  it('Cancelada es estado terminal: rechaza c → a y c → f', () => {
    expect(machine.canTransition(EmergencyStatus.Canceled, EmergencyStatus.Active)).toBe(false);
    expect(machine.canTransition(EmergencyStatus.Canceled, EmergencyStatus.Finished)).toBe(false);
  });

  it('assertTransition lanza BadRequestException con lista de transiciones válidas', () => {
    try {
      machine.assertTransition(EmergencyStatus.Pending, EmergencyStatus.Finished);
      fail('debería lanzar BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain("Transición de 'p' a 'f' no permitida");
      expect(error.message).toContain('a');
      expect(error.message).toContain('c');
    }
  });

  it('assertTransition no lanza para transición permitida', () => {
    expect(() =>
      machine.assertTransition(EmergencyStatus.Active, EmergencyStatus.Finished),
    ).not.toThrow();
  });
});
