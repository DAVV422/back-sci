import { MigrationInterface, QueryRunner } from "typeorm";

/** Columnas de instante que pasan de `timestamp` (sin zona) a `timestamptz`. */
const INSTANT_COLUMNS: Record<string, string[]> = {
    action: ['created_at', 'updated_at'],
    attend: ['created_at', 'updated_at'],
    audio: ['created_at', 'updated_at'],
    audit_log: ['created_at'],
    auth_token: ['created_at', 'updated_at', 'expires_at'],
    charge: ['created_at', 'updated_at'],
    data_fires: ['created_at', 'updated_at'],
    device_token: ['created_at', 'updated_at'],
    emergency: ['created_at', 'updated_at'],
    equipment: ['created_at', 'updated_at'],
    form201: ['created_at', 'updated_at', 'prepared_at', 'finalized_at'],
    form207: ['created_at', 'updated_at'],
    health_facility: ['created_at', 'updated_at'],
    initial_assessment: ['created_at', 'updated_at'],
    notification: ['created_at'],
    refresh_token: ['created_at', 'updated_at', 'expires_at'],
    registration: ['created_at'],
    resource: ['created_at', 'updated_at'],
    user: ['created_at', 'updated_at'],
    victim: ['created_at', 'updated_at'],
};

/** Tablas que guardan fecha y hora por separado (en UTC) y ganan `occurred_at`. */
const DATE_HOUR_TABLES = ['emergency', 'attend', 'action', 'registration'];

/**
 * Fechas con zona horaria (decisión 19, reportes por rango).
 *
 * 1. Los instantes pasan a `timestamptz`. Los valores existentes ya están en UTC (el proceso corre
 *    en UTC desde config/timezone.ts), así que se convierten con `AT TIME ZONE 'UTC'` sin
 *    cambiar el instante. Se hace con ALTER ... TYPE: TypeORM generaría DROP + ADD y perdería datos.
 * 2. `occurred_at` (timestamptz) en emergencia, asignación, acción y registro de triage: lo calcula
 *    un trigger a partir de `date` + `hour` (UTC) en cada INSERT/UPDATE, así la API no cambia y
 *    los reportes filtran y ordenan por una sola columna indexada. Se rellena para lo existente.
 */
export class TimestampsWithTimeZone1792180000000 implements MigrationInterface {
    name = 'TimestampsWithTimeZone1792180000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const [table, columns] of Object.entries(INSTANT_COLUMNS)) {
            for (const column of columns) {
                await queryRunner.query(
                    `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TIMESTAMP WITH TIME ZONE USING "${column}" AT TIME ZONE 'UTC'`,
                );
            }
        }

        // date (date o texto 'YYYY-MM-DD…') + hour ('HH:MM[:SS]') en UTC -> instante. Si la fecha no
        // es válida devuelve NULL; si falta la hora, toma la medianoche UTC.
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION sci_utc_instant(d text, h text) RETURNS timestamptz
            LANGUAGE plpgsql IMMUTABLE AS $$
            BEGIN
                IF d IS NULL OR substr(d, 1, 10) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
                    RETURN NULL;
                END IF;
                IF h IS NULL OR h !~ '^[0-9]{1,2}:[0-9]{2}' THEN
                    RETURN substr(d, 1, 10)::date::timestamp AT TIME ZONE 'UTC';
                END IF;
                RETURN (substr(d, 1, 10) || ' ' || substring(h from '^[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?'))::timestamp AT TIME ZONE 'UTC';
            EXCEPTION WHEN others THEN
                RETURN NULL;
            END $$`);
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION sci_set_occurred_at() RETURNS trigger
            LANGUAGE plpgsql AS $$
            BEGIN
                NEW.occurred_at := sci_utc_instant(NEW.date::text, NEW.hour::text);
                RETURN NEW;
            END $$`);

        for (const table of DATE_HOUR_TABLES) {
            await queryRunner.query(`ALTER TABLE "${table}" ADD "occurred_at" TIMESTAMP WITH TIME ZONE`);
            await queryRunner.query(`UPDATE "${table}" SET "occurred_at" = sci_utc_instant("date"::text, "hour"::text)`);
            await queryRunner.query(
                `CREATE TRIGGER "trg_${table}_occurred_at" BEFORE INSERT OR UPDATE OF "date", "hour" ON "${table}" FOR EACH ROW EXECUTE FUNCTION sci_set_occurred_at()`,
            );
            await queryRunner.query(`CREATE INDEX "idx_${table}_occurred_at" ON "${table}" ("occurred_at")`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of DATE_HOUR_TABLES) {
            await queryRunner.query(`DROP INDEX IF EXISTS "idx_${table}_occurred_at"`);
            await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_${table}_occurred_at" ON "${table}"`);
            await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "occurred_at"`);
        }
        await queryRunner.query(`DROP FUNCTION IF EXISTS sci_set_occurred_at()`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS sci_utc_instant(text, text)`);
        for (const [table, columns] of Object.entries(INSTANT_COLUMNS)) {
            for (const column of columns) {
                await queryRunner.query(
                    `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TIMESTAMP USING "${column}" AT TIME ZONE 'UTC'`,
                );
            }
        }
    }
}
