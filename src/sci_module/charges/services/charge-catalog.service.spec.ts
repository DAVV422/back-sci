import { DataSource } from 'typeorm';
import { ChargeCatalogService } from './charge-catalog.service';
import { RETIRED_CHARGE_NAMES, SCI_CHARGE_CATALOG } from '../sci-charge-catalog';

/** Tabla `charge` en memoria: suficiente para verificar la lógica de alineación. */
function fakeManager(initial: any[]) {
  const rows = initial.map((r, i) => ({ isDeleted: false, createdAt: new Date(2026, 0, i + 1), ...r }));
  let seq = 0;
  const manager = {
    rows,
    find: jest.fn(async () => rows.filter(() => true)),
    create: jest.fn((_entity: any, data: any) => ({ ...data })),
    save: jest.fn(async (row: any) => {
      const saved = { id: `new-${++seq}`, createdAt: new Date(), ...row };
      rows.push(saved);
      return saved;
    }),
    update: jest.fn(async (_entity: any, criteria: { id: string }, changes: any) => {
      Object.assign(rows.find((r) => r.id === criteria.id)!, changes);
    }),
    query: jest.fn(async () => undefined),
  };
  return manager;
}

function serviceWith(manager: ReturnType<typeof fakeManager>) {
  const dataSource = { transaction: (fn: (m: any) => unknown) => fn(manager) } as unknown as DataSource;
  return new ChargeCatalogService(dataSource);
}

describe('ChargeCatalogService', () => {
  it('con la tabla vacía crea todo el catálogo del manual', async () => {
    const manager = fakeManager([]);
    const report = await serviceWith(manager).sync();

    expect(report.created.length).toBe(SCI_CHARGE_CATALOG.length);
    expect(manager.rows.find((r) => r.systemName === 'staging_area_manager')).toEqual(
      expect.objectContaining({ name: 'Encargado del Área de Espera', abbreviation: 'EAE', level: 3 }),
    );
  });

  it('es idempotente: una segunda pasada no cambia nada', async () => {
    const manager = fakeManager([]);
    const service = serviceWith(manager);
    await service.sync();
    manager.save.mockClear();
    manager.update.mockClear();

    await expect(service.sync()).resolves.toEqual({ created: [], updated: [], merged: [], retired: [] });
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('renombra en el mismo registro los nombres anteriores (conserva las asignaciones)', async () => {
    const manager = fakeManager([
      { id: 'c-ops', name: 'jefe de operaciones', abbreviation: 'JOP', level: 2, weight: '5.00', systemName: 'operations_chief' },
      { id: 'c-dir', name: 'director de rama', abbreviation: 'DIR-RAMA', level: 3, weight: '5.10', systemName: null },
    ]);
    const report = await serviceWith(manager).sync();

    expect(manager.rows.find((r) => r.id === 'c-ops')).toEqual(
      expect.objectContaining({ name: 'Jefe de la Sección de Operaciones', abbreviation: 'JSO' }),
    );
    expect(manager.rows.find((r) => r.id === 'c-dir')).toEqual(
      expect.objectContaining({ name: 'Coordinador de Rama', abbreviation: 'CR', systemName: 'branch_director' }),
    );
    expect(report.updated).toEqual(expect.arrayContaining(['operations_chief', 'branch_director']));
  });

  it('una clave anterior se migra también en las asignaciones', async () => {
    const manager = fakeManager([
      { id: 'c-atk', name: 'equipo de ataque', abbreviation: 'EQ-ATK', level: 5, weight: '5.10', systemName: 'attack_team' },
    ]);
    await serviceWith(manager).sync();

    expect(manager.rows.find((r) => r.id === 'c-atk')).toEqual(
      expect.objectContaining({ name: 'Integrante de Equipo de Intervención', systemName: 'intervention_team_member' }),
    );
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE attend SET charge_system_name'), [
      'intervention_team_member',
      'c-atk',
    ]);
  });

  it('fusiona duplicados: pasa las asignaciones al que tiene la clave y borra el resto', async () => {
    const manager = fakeManager([
      { id: 'c-old', name: 'unidad médica', abbreviation: null, level: 4, weight: '2.00', systemName: null },
      { id: 'c-med', name: 'líder de unidad médica', abbreviation: 'LID-MED', level: 4, weight: '7.12', systemName: 'medical_unit_leader' },
    ]);
    const report = await serviceWith(manager).sync();

    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('SET charge_id = $1'), ['c-med', 'medical_unit_leader', 'c-old']);
    expect(manager.rows.find((r) => r.id === 'c-old')).toEqual(expect.objectContaining({ isDeleted: true, systemName: null }));
    expect(manager.rows.find((r) => r.id === 'c-med')).toEqual(
      expect.objectContaining({ name: 'Líder de la Unidad Médica', abbreviation: 'LUMED', isDeleted: false }),
    );
    expect(report.merged).toEqual(['unidad médica → medical_unit_leader']);
  });

  it('retira lo que no son cargos SCI y no toca cargos propios de la institución', async () => {
    const manager = fakeManager([
      { id: 'c-resc', name: 'rescatista', abbreviation: 'RESC', level: 5, weight: '5.30', systemName: null },
      { id: 'c-own', name: 'Enlace municipal', abbreviation: 'EM', level: 3, weight: '9.00', systemName: null },
    ]);
    const report = await serviceWith(manager).sync();

    expect(manager.rows.find((r) => r.id === 'c-resc')!.isDeleted).toBe(true);
    expect(manager.rows.find((r) => r.id === 'c-own')!.isDeleted).toBe(false);
    expect(report.retired).toEqual(['rescatista']);
  });

  it('el catálogo no repite claves, nombres ni alias, y no retira cargos del manual', () => {
    const systemNames = SCI_CHARGE_CATALOG.flatMap((c) => [c.systemName, ...(c.legacySystemNames ?? [])]);
    const names = SCI_CHARGE_CATALOG.flatMap((c) => [c.name, ...(c.aliases ?? [])].map((n) => n.toLowerCase()));
    expect(new Set(systemNames).size).toBe(systemNames.length);
    expect(new Set(names).size).toBe(names.length);
    for (const retired of RETIRED_CHARGE_NAMES) expect(names).not.toContain(retired.toLowerCase());
    for (const c of SCI_CHARGE_CATALOG) expect(Math.round(c.weight * 100) / 100).toBe(c.weight); // decimal(5,2)
  });

  it('un fallo al arrancar se registra y no tumba la aplicación', async () => {
    const dataSource = { transaction: jest.fn().mockRejectedValue(new Error('db caída')) } as unknown as DataSource;
    await expect(new ChargeCatalogService(dataSource).onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
