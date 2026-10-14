import { ForbiddenException } from '@nestjs/common';
import { In } from 'typeorm';

import { EmergencyAccessService } from './emergency-access.service';

describe('EmergencyAccessService', () => {
  let service: EmergencyAccessService;
  let attendRepository: { findOne: jest.Mock };

  beforeEach(() => {
    attendRepository = { findOne: jest.fn() };
    service = new EmergencyAccessService(attendRepository as any);
  });

  describe('assertMember', () => {
    it.each(['manager', 'admin', 'suadmin', 'MANAGER'])(
      'rol %s pasa sin consultar asignaciones',
      async (role) => {
        await expect(
          service.assertMember('em-1', 'user-1', role),
        ).resolves.toBeUndefined();
        expect(attendRepository.findOne).not.toHaveBeenCalled();
      },
    );

    it('usuario basic con asignación activa pasa', async () => {
      attendRepository.findOne.mockResolvedValue({ id: 'attend-1' });
      await expect(
        service.assertMember('em-1', 'user-1', 'basic'),
      ).resolves.toBeUndefined();
      expect(attendRepository.findOne).toHaveBeenCalledWith({
        where: {
          emergency: { id: 'em-1' },
          user: { id: 'user-1' },
          isActive: true,
          isDeleted: false,
        },
      });
    });

    it('usuario basic sin asignación → ForbiddenException', async () => {
      attendRepository.findOne.mockResolvedValue(null);
      await expect(
        service.assertMember('em-1', 'user-1', 'basic'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertHasCharge', () => {
    it('filtra la asignación por los cargos indicados', async () => {
      attendRepository.findOne.mockResolvedValue({ id: 'attend-1' });
      await service.assertHasCharge(
        'em-1',
        'user-1',
        'advanced',
        ['incident_commander', 'medical_unit_leader'],
        'msg',
      );
      expect(attendRepository.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          chargeSystemName: In(['incident_commander', 'medical_unit_leader']),
        }),
      });
    });

    it('sin el cargo requerido → ForbiddenException con el mensaje dado', async () => {
      attendRepository.findOne.mockResolvedValue(null);
      await expect(
        service.assertHasCharge('em-1', 'user-1', 'basic', ['incident_commander'], 'Sin permiso'),
      ).rejects.toThrow('Sin permiso');
    });
  });

  describe('assertCommanderOrManager', () => {
    it('exige el cargo de CI activo', async () => {
      attendRepository.findOne.mockResolvedValue({ id: 'attend-ci' });
      await service.assertCommanderOrManager('em-1', 'user-1', 'basic');
      expect(attendRepository.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          chargeSystemName: In(['incident_commander']),
        }),
      });
    });

    it('sin cargo de CI → ForbiddenException', async () => {
      attendRepository.findOne.mockResolvedValue(null);
      await expect(
        service.assertCommanderOrManager('em-1', 'user-1', 'advanced'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertCanViewPatients (decisión 18)', () => {
    it.each(['advanced', 'manager', 'admin', 'suadmin'])(
      'rol %s ve pacientes sin consultar asignaciones',
      async (role) => {
        await expect(service.assertCanViewPatients('em-1', 'user-1', role)).resolves.toBeUndefined();
        expect(attendRepository.findOne).not.toHaveBeenCalled();
      },
    );

    it('basic que participó (aunque su asignación ya no esté activa) puede ver', async () => {
      attendRepository.findOne.mockResolvedValue({ id: 'attend-1', isActive: false });
      await expect(service.assertCanViewPatients('em-1', 'user-1', 'basic')).resolves.toBeUndefined();
      const where = attendRepository.findOne.mock.calls[0][0].where;
      expect(where).toEqual({ emergency: { id: 'em-1' }, user: { id: 'user-1' }, isDeleted: false });
    });

    it('basic que no participó → ForbiddenException', async () => {
      attendRepository.findOne.mockResolvedValue(null);
      await expect(service.assertCanViewPatients('em-1', 'user-1', 'basic')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
