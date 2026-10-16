import { MigrationInterface, QueryRunner } from "typeorm";

/** Notificaciones enlazadas a su emergencia, para abrirla desde el centro de notificaciones. */
export class NotificationEmergency1792210000000 implements MigrationInterface {
    name = 'NotificationEmergency1792210000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" ADD "emergency_id" uuid`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_386d895df106f64a0cce5c8253d" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_386d895df106f64a0cce5c8253d"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "emergency_id"`);
    }

}
