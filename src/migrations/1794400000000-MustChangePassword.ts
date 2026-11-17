import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `user.must_change_password`: la contraseña la asignó un tercero y hay que cambiarla al entrar.
 *
 * Se enciende solo al crear una cuenta con contraseña asignada por un administrador. Mientras está
 * encendida, el guard bloquea todo el sistema salvo el cambio de contraseña: sin ese bloqueo
 * bastaría usar la API para saltarse la pantalla y dejar viva la contraseña que conoce otra persona.
 *
 * Por defecto `false`: las cuentas que ya existen no cambian nada (decisión 9).
 */
export class MustChangePassword1794400000000 implements MigrationInterface {
  name = 'MustChangePassword1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "must_change_password" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "must_change_password"`);
  }
}
