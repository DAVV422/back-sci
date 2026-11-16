import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `user.activated_at`: cuándo entró en funcionamiento la cuenta (nulo = nunca se activó).
 *
 * `is_active = false` significaba dos cosas distintas —cuenta nueva esperando su invitación, y
 * cuenta suspendida por un administrador—, así que no se podían separar. Con esta marca,
 * "pendiente de activación" pasa a ser una condición positiva:
 *
 *     NOT is_deleted AND NOT is_active AND activated_at IS NULL
 *
 * Relleno: toda cuenta que hoy está activa ya entró alguna vez, así que se le pone `updated_at`
 * como momento aproximado. Si no se rellenara, suspender a cualquiera de ellas la haría parecer
 * una cuenta nueva y le llegaría una invitación al corregirle el correo.
 */
export class UserActivatedAt1794300000000 implements MigrationInterface {
  name = 'UserActivatedAt1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "activated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "user" SET "activated_at" = COALESCE("updated_at", "created_at") WHERE "is_active" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "activated_at"`);
  }
}
