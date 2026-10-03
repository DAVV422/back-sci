import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateForm201Dto } from '../../incident_module/form-201/dto/create-form-201.dto';
import { CreateForm207Dto } from '../../victim_registry_module/form-207/dto/create-form-207.dto';
import { CreateEquipmentDto } from '../../organization_module/equipment/dto/create-equipment.dto';
import { CreateResourceDto } from '../../organization_module/resource/dto/create-resource.dto';

/**
 * Reproduce la transformación del ValidationPipe global de main.ts
 * (`transformOptions.enableImplicitConversion: true`). Con `date: Date` en el DTO el string se
 * convertía a Date antes de validar y @IsDateString() rechazaba toda creación de F201/F207.
 */
const validateLikeMain = async <T extends object>(dto: new () => T, body: object) =>
  validate(plainToInstance(dto, body, { enableImplicitConversion: true }));

describe('fechas de formularios con la conversión implícita del ValidationPipe', () => {
  it('CreateForm207Dto acepta una fecha ISO', async () => {
    const errors = await validateLikeMain(CreateForm207Dto, {
      placeOfRegistration: 'PMA Sur',
      attendant: 'Dra. Morales',
      date: '2026-10-03',
    });
    expect(errors).toEqual([]);
  });

  it('CreateForm201Dto acepta una fecha ISO', async () => {
    const errors = await validateLikeMain(CreateForm201Dto, {
      date: '2026-10-03',
      nature: 'Incendio forestal',
      thread: 'Propagación hacia viviendas',
      affectedArea: 'Sector Las Lomas',
      communicationsChannel: 'Canal 2',
      entryRoute: 'Ruta 1',
      egressRoute: 'Ruta 2',
      objectives: 'Contener el frente norte',
      strategies: 'Ataque indirecto',
      tactics: 'Línea de control',
      safetyMessage: 'Rutas de escape definidas',
    });
    expect(errors.map((e) => e.property)).not.toContain('date');
  });

  it('sigue rechazando fechas inválidas', async () => {
    const errors = await validateLikeMain(CreateForm207Dto, {
      placeOfRegistration: 'PMA Sur',
      attendant: 'Dra. Morales',
      date: 'ayer',
    });
    expect(errors.map((e) => e.property)).toContain('date');
  });
});

