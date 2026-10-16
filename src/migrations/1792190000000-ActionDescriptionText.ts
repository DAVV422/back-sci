import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * `action.description` pasa de varchar(500) a text: el registro del traspaso de mando con su lista
 * de transferencia y, en la Etapa 2, los resúmenes de notas de voz superan los 500 caracteres.
 * ALTER ... TYPE conserva los datos (TypeORM generaría DROP + ADD).
 */
export class ActionDescriptionText1792190000000 implements MigrationInterface {
    name = 'ActionDescriptionText1792190000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "action" ALTER COLUMN "description" TYPE text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "action" ALTER COLUMN "description" TYPE character varying(500) USING left("description", 500)`);
    }
}
