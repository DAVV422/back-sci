import { MigrationInterface, QueryRunner } from "typeorm";

export class AffectedAreasMap1793062409343 implements MigrationInterface {
    name = 'AffectedAreasMap1793062409343'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "form201" ADD "affected_areas_map" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "form201" DROP COLUMN "affected_areas_map"`);
    }

}
