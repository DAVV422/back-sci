import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMapType1793106482406 implements MigrationInterface {
    name = 'UserMapType1793106482406'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_map_type_enum" AS ENUM('roadmap', 'hybrid')`);
        await queryRunner.query(`ALTER TABLE "user" ADD "map_type" "public"."user_map_type_enum" NOT NULL DEFAULT 'roadmap'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "map_type"`);
        await queryRunner.query(`DROP TYPE "public"."user_map_type_enum"`);
    }

}
