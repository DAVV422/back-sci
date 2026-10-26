import { MigrationInterface, QueryRunner } from "typeorm";

export class OptionalWhileOpen1792980931461 implements MigrationInterface {
    name = 'OptionalWhileOpen1792980931461'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "nature" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "thread" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "affected_area" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "communications_channel" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "entry_route" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "egress_route" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "objectives" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "strategies" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "tactics" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "safety_message" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "initial_assessment" ALTER COLUMN "hazard_type" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "initial_assessment" ALTER COLUMN "hazard_type" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "safety_message" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "tactics" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "strategies" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "objectives" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "egress_route" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "entry_route" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "communications_channel" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "affected_area" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "thread" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "form201" ALTER COLUMN "nature" SET NOT NULL`);
    }

}
