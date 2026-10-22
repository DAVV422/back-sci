import { MigrationInterface, QueryRunner } from "typeorm";

export class VehiclesAndEquipmentUse1792707149790 implements MigrationInterface {
    name = 'VehiclesAndEquipmentUse1792707149790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "vehicle_load_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "vehicle_id" uuid NOT NULL, "equipment_id" uuid NOT NULL, CONSTRAINT "PK_2c6d25567243c7c1d40eb47ba5b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_vehicle_load_item" ON "vehicle_load_item" ("vehicle_id", "equipment_id") `);
        await queryRunner.query(`CREATE TABLE "vehicle" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(20) NOT NULL, "vehicle_type" character varying(50) NOT NULL, "plate" character varying(20), "status" character varying(20) NOT NULL DEFAULT 'available', "notes" character varying(255), CONSTRAINT "PK_187fa17ba39d367e5604b3d1ec9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_vehicle_code" ON "vehicle" ("code") WHERE is_deleted = false`);
        await queryRunner.query(`CREATE TABLE "vehicle_dispatch" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "note" character varying(255), "returned_at" TIMESTAMP WITH TIME ZONE, "vehicle_id" uuid NOT NULL, "emergency_id" uuid NOT NULL, "dispatched_by" uuid, CONSTRAINT "PK_ecce55652f18b58fa0f61f3d751" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_vehicle_dispatch_active" ON "vehicle_dispatch" ("vehicle_id") WHERE returned_at IS NULL AND is_deleted = false`);
        await queryRunner.query(`ALTER TABLE "equipment" ADD "category" character varying(30) NOT NULL DEFAULT 'otro'`);
        await queryRunner.query(`ALTER TABLE "equipment" ADD "general_use" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "equipment" ADD "emergency_types" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "resource" ADD "vehicle_dispatch_id" uuid`);
        await queryRunner.query(`ALTER TABLE "vehicle_load_item" ADD CONSTRAINT "FK_66b085ff1f9e22d2593032218e4" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicle_load_item" ADD CONSTRAINT "FK_ac25aeb7e06529ae588ad171cf0" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicle_dispatch" ADD CONSTRAINT "FK_ac9376bc27796b07e1dc590e69f" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicle_dispatch" ADD CONSTRAINT "FK_b86d85c6faac119830ccfd473e2" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicle_dispatch" ADD CONSTRAINT "FK_8fa8e635ca3f8466791737e6461" FOREIGN KEY ("dispatched_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resource" ADD CONSTRAINT "FK_b6b34cbb44c0d57c7aa03a3d0b8" FOREIGN KEY ("vehicle_dispatch_id") REFERENCES "vehicle_dispatch"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "resource" DROP CONSTRAINT "FK_b6b34cbb44c0d57c7aa03a3d0b8"`);
        await queryRunner.query(`ALTER TABLE "vehicle_dispatch" DROP CONSTRAINT "FK_8fa8e635ca3f8466791737e6461"`);
        await queryRunner.query(`ALTER TABLE "vehicle_dispatch" DROP CONSTRAINT "FK_b86d85c6faac119830ccfd473e2"`);
        await queryRunner.query(`ALTER TABLE "vehicle_dispatch" DROP CONSTRAINT "FK_ac9376bc27796b07e1dc590e69f"`);
        await queryRunner.query(`ALTER TABLE "vehicle_load_item" DROP CONSTRAINT "FK_ac25aeb7e06529ae588ad171cf0"`);
        await queryRunner.query(`ALTER TABLE "vehicle_load_item" DROP CONSTRAINT "FK_66b085ff1f9e22d2593032218e4"`);
        await queryRunner.query(`ALTER TABLE "resource" DROP COLUMN "vehicle_dispatch_id"`);
        await queryRunner.query(`ALTER TABLE "equipment" DROP COLUMN "emergency_types"`);
        await queryRunner.query(`ALTER TABLE "equipment" DROP COLUMN "general_use"`);
        await queryRunner.query(`ALTER TABLE "equipment" DROP COLUMN "category"`);
        await queryRunner.query(`DROP INDEX "public"."uq_vehicle_dispatch_active"`);
        await queryRunner.query(`DROP TABLE "vehicle_dispatch"`);
        await queryRunner.query(`DROP INDEX "public"."uq_vehicle_code"`);
        await queryRunner.query(`DROP TABLE "vehicle"`);
        await queryRunner.query(`DROP INDEX "public"."uq_vehicle_load_item"`);
        await queryRunner.query(`DROP TABLE "vehicle_load_item"`);
    }

}
