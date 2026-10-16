import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ActionService } from './action.service';
import { ActionEntity } from '../entities/action.entity';
import { AudioEntity } from '../entities/audio.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { EmergencyAccessService } from '../../../organization_module/emergency/services/emergency-access.service';
import { UserService } from '../../../user/services/user.service';
import { EmergencyStatus } from '../../../organization_module/emergency/enums/emergency-status.enum';

describe('ActionService', () => {
  let service: ActionService;
  let mockEmergencyService: any;
  let mockStorage: any;
  let mockAudioRepo: any;
  let mockActionRepo: any;

  const mockEmergencyAccessService = {
    assertMember: jest.fn().mockResolvedValue(undefined),
    assertHasCharge: jest.fn().mockResolvedValue(undefined),
    assertCommanderOrManager: jest.fn().mockResolvedValue(undefined),
    assertCanViewPatients: jest.fn().mockResolvedValue(undefined),
    isManagerOrAbove: jest.fn((role: string) => ['manager', 'admin', 'suadmin'].includes(role)),
  };

  beforeEach(async () => {
    mockEmergencyService = {
      findOne: jest.fn(),
      assertEditable: jest.fn(),
    };
    mockActionRepo = {
      findOne: jest.fn(),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'act-1', ...data })),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };

    mockStorage = { put: jest.fn(), get: jest.fn().mockResolvedValue({ stream: 's', size: 1 }), exists: jest.fn().mockResolvedValue(true), delete: jest.fn() };
    mockAudioRepo = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'aud-1', ...data })),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionService,
        { provide: getRepositoryToken(ActionEntity), useValue: mockActionRepo },
        { provide: getRepositoryToken(AudioEntity), useValue: mockAudioRepo },
        { provide: 'STORAGE_SERVICE', useValue: mockStorage },
        { provide: EmergencyService, useValue: mockEmergencyService },
        {
          provide: EmergencyAccessService,
          useValue: mockEmergencyAccessService,
        },
        {
          provide: UserService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'user-1' }) },
        },
      ],
    }).compile();

    service = module.get<ActionService>(ActionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('audios en el almacenamiento (P1 #12)', () => {
    const active = { id: 'emg-1', state: 'a' };
    const withAudio = (pathAudio: string) => ({
      emergency: 'emg-1', description: 'Nota', date: new Date('2026-10-03'), hour: '10:00',
      audio: { pathAudio, duration: 3 },
    }) as any;

    beforeEach(() => {
      mockEmergencyService.findOne.mockResolvedValue(active);
      mockEmergencyService.assertEditable.mockImplementation(() => undefined);
    });

    it('acepta un audio propio de esa emergencia y guarda la clave (también desde la ruta antigua)', async () => {
      mockActionRepo.findOne.mockResolvedValue({ id: 'act-1' });
      await service.create(withAudio('data/audios/user-1/emg-1/audio_1.m4a'), 'user-1', 'basic');
      expect(mockStorage.exists).toHaveBeenCalledWith('audios/user-1/emg-1/audio_1.m4a');
      expect(mockAudioRepo.create).toHaveBeenCalledWith(expect.objectContaining({ pathAudio: 'audios/user-1/emg-1/audio_1.m4a' }));
    });

    it.each([
      ['de otro usuario', 'audios/otro-user/emg-1/audio_1.m4a'],
      ['de otra emergencia', 'audios/user-1/emg-2/audio_1.m4a'],
      ['fuera de la carpeta de audios', 'data/uploads/profiles/profile_1.png'],
      ['con ..', 'audios/user-1/emg-1/../../otro-user/emg-1/a.m4a'],
    ])('rechaza un pathAudio %s', async (_case, pathAudio) => {
      await expect(service.create(withAudio(pathAudio), 'user-1', 'basic')).rejects.toThrow(BadRequestException);
      expect(mockAudioRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza un audio propio que no existe en el almacenamiento', async () => {
      mockStorage.exists.mockResolvedValue(false);
      await expect(service.create(withAudio('audios/user-1/emg-1/fantasma.m4a'), 'user-1', 'basic')).rejects.toThrow(BadRequestException);
    });

    it('al reproducir toma el tipo de la extensión guardada, no el que declaró el cliente', async () => {
      mockAudioRepo.findOne.mockResolvedValue({ id: 'aud-1', pathAudio: 'data/audios/user-1/emg-1/audio_1.m4a', mimeType: 'text/html', fileName: 'nota.m4a' });
      const file = await service.getAudioFile('aud-1');
      expect(mockStorage.get).toHaveBeenCalledWith('audios/user-1/emg-1/audio_1.m4a');
      expect(file.mimeType).toBe('audio/mp4');
    });

    it('una ruta corrupta en la base da 404, no lee nada', async () => {
      mockAudioRepo.findOne.mockResolvedValue({ id: 'aud-1', pathAudio: '../../.env' });
      await expect(service.getAudioFile('aud-1')).rejects.toThrow(NotFoundException);
      expect(mockStorage.get).not.toHaveBeenCalled();
    });
  });

  describe('create - bloqueo de edición (F1-011)', () => {
    const dto = {
      emergency: 'emg-1',
      description: 'Abrir vía de acceso',
      date: new Date('2024-06-19'),
      hour: '15:00',
    } as any;

    it('lanza BadRequestException al crear acción para emergencia finalizada', async () => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Finished,
      });
      mockEmergencyService.assertEditable.mockImplementation(() => {
        throw new BadRequestException(
          'La emergencia está finalizada. No se permiten ediciones.',
        );
      });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        'La emergencia está finalizada. No se permiten ediciones.',
      );
      expect(mockActionRepo.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException al crear acción para emergencia cancelada', async () => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Canceled,
      });
      mockEmergencyService.assertEditable.mockImplementation(() => {
        throw new BadRequestException(
          'La emergencia está cancelada. No se permiten ediciones.',
        );
      });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        'La emergencia está cancelada. No se permiten ediciones.',
      );
      expect(mockActionRepo.save).not.toHaveBeenCalled();
    });

    it('permite crear acción para emergencia activa', async () => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Active,
      });
      mockEmergencyService.assertEditable.mockReturnValue(undefined);
      mockActionRepo.findOne.mockResolvedValue({ id: 'act-1' });

      const result = await service.create(dto, 'user-1');

      expect(mockActionRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('act-1');
    });
  });

  describe('delete - soft delete (F1-012)', () => {
    it('marca is_deleted = true en vez de borrar físicamente', async () => {
      mockActionRepo.findOne.mockResolvedValue({
        id: 'act-1',
        emergency: { id: 'emg-1' },
      });
      mockActionRepo.update.mockResolvedValue({ affected: 1 });

      await service.delete('act-1');

      expect(mockActionRepo.update).toHaveBeenCalledWith('act-1', {
        isDeleted: true,
      });
      expect(mockActionRepo.delete).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el update no afecta filas', async () => {
      mockActionRepo.findOne.mockResolvedValue({ id: 'act-1' });
      mockActionRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.delete('act-1')).rejects.toThrow(
        'Acción no eliminada.',
      );
    });
  });
});
