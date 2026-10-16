import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Historial de la organización (casilla 14 del SCI-201: cada cambio de estructura queda registrado).
 *
 * Tabla `organization_change` + trigger AFTER INSERT/UPDATE sobre `attend`: registra altas, bajas
 * (is_active true → false), cambios de cargo y eliminaciones, con el nombre de la persona y del
 * cargo de ese momento. Al ser un trigger, queda registrado venga el cambio de donde venga (web,
 * traspaso de mando, sincronización móvil). Se rellena con lo existente: un alta por asignación y,
 * si ya no está activa, su baja (con `updated_at` como momento aproximado).
 */
export class OrganizationHistory1792200000000 implements MigrationInterface {
    name = 'OrganizationHistory1792200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "organization_change" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "attend_id" uuid NOT NULL, "change_type" character varying(20) NOT NULL, "user_id" uuid NOT NULL, "user_name" character varying(201) NOT NULL, "charge_id" uuid NOT NULL, "charge_name" character varying(100) NOT NULL, "charge_level" integer NOT NULL, "previous_charge_name" character varying(100), "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "emergency_id" uuid NOT NULL, CONSTRAINT "PK_450b48e9ac5c37bd37dce8fe816" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_organization_change_emergency" ON "organization_change" ("emergency_id", "occurred_at") `);
        await queryRunner.query(`ALTER TABLE "organization_change" ADD CONSTRAINT "FK_eb28365cd1731078760ce8f2b87" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION sci_record_organization_change(a attend, kind text, at timestamptz, previous_charge uuid)
            RETURNS void LANGUAGE plpgsql AS $$
            BEGIN
                INSERT INTO organization_change
                    (emergency_id, attend_id, change_type, user_id, user_name, charge_id, charge_name, charge_level, previous_charge_name, occurred_at)
                SELECT a.emergency_id, a.id, kind, a.user_id, trim(u.name || ' ' || u.last_name),
                       a.charge_id, c.name, c.level,
                       (SELECT pc.name FROM charge pc WHERE pc.id = previous_charge),
                       at
                  FROM "user" u, charge c
                 WHERE u.id = a.user_id AND c.id = a.charge_id;
            END $$`);
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION sci_attend_organization_change() RETURNS trigger
            LANGUAGE plpgsql AS $$
            BEGIN
                IF TG_OP = 'INSERT' THEN
                    IF NEW.is_active AND NOT NEW.is_deleted THEN
                        PERFORM sci_record_organization_change(NEW, 'assigned', COALESCE(NEW.occurred_at, now()), NULL);
                    END IF;
                    RETURN NEW;
                END IF;
                IF NOT OLD.is_deleted AND NEW.is_deleted THEN
                    PERFORM sci_record_organization_change(NEW, 'removed', now(), NULL);
                ELSIF OLD.is_active AND NOT NEW.is_active THEN
                    PERFORM sci_record_organization_change(NEW, 'released', now(), NULL);
                ELSIF NOT OLD.is_active AND NEW.is_active THEN
                    PERFORM sci_record_organization_change(NEW, 'assigned', now(), NULL);
                ELSIF NEW.is_active AND OLD.charge_id IS DISTINCT FROM NEW.charge_id THEN
                    PERFORM sci_record_organization_change(NEW, 'charge_changed', now(), OLD.charge_id);
                END IF;
                RETURN NEW;
            END $$`);
        await queryRunner.query(`CREATE TRIGGER "trg_attend_organization_change" AFTER INSERT OR UPDATE ON "attend" FOR EACH ROW EXECUTE FUNCTION sci_attend_organization_change()`);

        // Historial existente: alta de cada asignación y baja de las ya cerradas.
        await queryRunner.query(`
            INSERT INTO organization_change (emergency_id, attend_id, change_type, user_id, user_name, charge_id, charge_name, charge_level, occurred_at)
            SELECT a.emergency_id, a.id, 'assigned', a.user_id, trim(u.name || ' ' || u.last_name), a.charge_id, c.name, c.level,
                   COALESCE(a.occurred_at, a.created_at)
              FROM attend a JOIN "user" u ON u.id = a.user_id JOIN charge c ON c.id = a.charge_id
             WHERE NOT a.is_deleted`);
        await queryRunner.query(`
            INSERT INTO organization_change (emergency_id, attend_id, change_type, user_id, user_name, charge_id, charge_name, charge_level, occurred_at)
            SELECT a.emergency_id, a.id, 'released', a.user_id, trim(u.name || ' ' || u.last_name), a.charge_id, c.name, c.level, a.updated_at
              FROM attend a JOIN "user" u ON u.id = a.user_id JOIN charge c ON c.id = a.charge_id
             WHERE NOT a.is_deleted AND NOT a.is_active`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_attend_organization_change" ON "attend"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS sci_attend_organization_change()`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS sci_record_organization_change(attend, text, timestamptz, uuid)`);
        await queryRunner.query(`ALTER TABLE "organization_change" DROP CONSTRAINT "FK_eb28365cd1731078760ce8f2b87"`);
        await queryRunner.query(`DROP INDEX "public"."idx_organization_change_emergency"`);
        await queryRunner.query(`DROP TABLE "organization_change"`);
    }
}
