import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ChargeEntity } from '../entities/charges.entity';
import { RETIRED_CHARGE_NAMES, SCI_CHARGE_CATALOG, SciChargeDefinition } from '../sci-charge-catalog';

export interface ChargeCatalogSyncReport {
  created: string[];
  updated: string[];
  merged: string[];
  retired: string[];
}

const key = (name: string | null | undefined) => (name ?? '').trim().toLowerCase();

/**
 * Alinea la tabla `charge` con `SCI_CHARGE_CATALOG` (el manual). Idempotente: corre al arrancar
 * (desactivable con CHARGE_CATALOG_SYNC=false) y desde el seeder.
 *
 * Para cada cargo del manual busca el registro por clave (`systemName` o una anterior) o por
 * nombre (actual o anterior) y lo actualiza en el mismo id, de modo que las asignaciones se
 * conservan. Si hay varios registros para un mismo cargo, pasa sus asignaciones al que queda y
 * borra lógicamente los demás. Los cargos creados por un administrador que no están en el
 * catálogo no se tocan; solo se retiran las entradas que no son cargos (`RETIRED_CHARGE_NAMES`).
 */
@Injectable()
export class ChargeCatalogService implements OnApplicationBootstrap {
  private readonly logger = new Logger('ChargeCatalogService');

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.CHARGE_CATALOG_SYNC === 'false') return;
    try {
      const report = await this.sync();
      const changes = report.created.length + report.updated.length + report.merged.length + report.retired.length;
      if (changes) this.logger.log(`[sync] Catálogo de cargos alineado al manual: ${JSON.stringify(report)}`);
    } catch (error) {
      // Un fallo aquí no debe impedir que la API arranque: el catálogo anterior sigue usable.
      this.logger.error(`[sync] No se pudo alinear el catálogo de cargos: ${error?.message}`, error?.stack);
    }
  }

  sync(): Promise<ChargeCatalogSyncReport> {
    return this.dataSource.transaction((manager) => this.syncWith(manager));
  }

  private async syncWith(manager: EntityManager): Promise<ChargeCatalogSyncReport> {
    const report: ChargeCatalogSyncReport = { created: [], updated: [], merged: [], retired: [] };
    const rows = await manager.find(ChargeEntity, { order: { createdAt: 'ASC' } });
    const claimed = new Set<string>();

    for (const def of SCI_CHARGE_CATALOG) {
      const candidates = this.candidatesFor(def, rows).filter((row) => !claimed.has(row.id));
      if (!candidates.length) {
        const created = await manager.save(manager.create(ChargeEntity, this.fieldsOf(def)));
        rows.push(created);
        claimed.add(created.id);
        report.created.push(def.systemName);
        continue;
      }

      const [keeper, ...duplicates] = this.rank(def, candidates);
      candidates.forEach((row) => claimed.add(row.id));

      for (const duplicate of duplicates) {
        await manager.query(
          'UPDATE attend SET charge_id = $1, charge_system_name = $2 WHERE charge_id = $3',
          [keeper.id, def.systemName, duplicate.id],
        );
        // La clave es única: se libera antes de asignarla al registro que queda.
        await manager.update(ChargeEntity, { id: duplicate.id }, { isDeleted: true, systemName: null });
        report.merged.push(`${duplicate.name} → ${def.systemName}`);
      }

      if (this.differs(keeper, def)) {
        const keyChanged = keeper.systemName !== def.systemName;
        await manager.update(ChargeEntity, { id: keeper.id }, this.fieldsOf(def));
        if (keyChanged) {
          await manager.query('UPDATE attend SET charge_system_name = $1 WHERE charge_id = $2', [def.systemName, keeper.id]);
        }
        report.updated.push(def.systemName);
      }
    }

    const retired = new Set(RETIRED_CHARGE_NAMES.map(key));
    for (const row of rows) {
      if (claimed.has(row.id) || row.isDeleted || !retired.has(key(row.name))) continue;
      await manager.update(ChargeEntity, { id: row.id }, { isDeleted: true, systemName: null });
      report.retired.push(row.name);
    }
    return report;
  }

  private candidatesFor(def: SciChargeDefinition, rows: ChargeEntity[]): ChargeEntity[] {
    const keys = new Set([def.systemName, ...(def.legacySystemNames ?? [])]);
    const names = new Set([def.name, ...(def.aliases ?? [])].map(key));
    return rows.filter((row) => (row.systemName && keys.has(row.systemName)) || names.has(key(row.name)));
  }

  /** Queda el que ya tiene la clave; si no, uno vigente; si no, el más antiguo. */
  private rank(def: SciChargeDefinition, candidates: ChargeEntity[]): ChargeEntity[] {
    const score = (row: ChargeEntity) =>
      (row.systemName === def.systemName ? 4 : 0) +
      (def.legacySystemNames?.includes(row.systemName ?? '') ? 2 : 0) +
      (row.isDeleted ? 0 : 1);
    return [...candidates].sort((a, b) => score(b) - score(a));
  }

  private differs(row: ChargeEntity, def: SciChargeDefinition): boolean {
    return row.name !== def.name || row.abbreviation !== def.abbreviation || row.level !== def.level ||
      Number(row.weight) !== def.weight || row.systemName !== def.systemName || row.isDeleted;
  }

  private fieldsOf(def: SciChargeDefinition): Partial<ChargeEntity> {
    return {
      name: def.name,
      abbreviation: def.abbreviation,
      level: def.level,
      weight: def.weight,
      systemName: def.systemName,
      isDeleted: false,
    };
  }
}
