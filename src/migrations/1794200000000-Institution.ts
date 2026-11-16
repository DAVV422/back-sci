import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * La institución dueña de la instalación (una sola fila). El servicio la crea al primer arranque
 * con `INSTITUTION_NAME` / `INSTITUTION_SHORT_NAME`; después la edita el Admin desde la app.
 */
export class Institution1794200000000 implements MigrationInterface {
  name = 'Institution1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'institution',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          { name: 'short_name', type: 'varchar', length: '40', isNullable: true },
          { name: 'logo_file_name', type: 'varchar', length: '255', isNullable: true },
          { name: 'is_deleted', type: 'boolean', isNullable: false, default: false },
          { name: 'created_at', type: 'timestamptz', isNullable: false, default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', isNullable: false, default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('institution', true);
  }
}
