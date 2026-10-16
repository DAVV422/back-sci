import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Esquema completo al 2026-10-16, generado desde las entidades sobre una base vacía.
 *
 * Hasta acá el esquema se mantenía con `synchronize`. Las bases que ya existían (desarrollo o una
 * instalación previa) tienen estas tablas: en ellas la migración no hace nada y queda registrada
 * como aplicada. Desde aquí todo cambio de entidad va con su propia migración
 * (`npm run migration:generate -- src/migrations/<Nombre>`).
 */
export class InitialSchema1792175699501 implements MigrationInterface {
    name = 'InitialSchema1792175699501'

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasTable('user')) return; // base ya creada con synchronize
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "form201" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(15) NOT NULL, "date" date NOT NULL, "nature" character varying(150) NOT NULL, "thread" text NOT NULL, "affected_area" character varying(255) NOT NULL, "communications_channel" character varying(100) NOT NULL, "entry_route" character varying(255) NOT NULL, "egress_route" character varying(255) NOT NULL, "affected_areas_map_url" character varying(500), "croquis_image" character varying(255), "situation_map" jsonb, "objectives" text NOT NULL, "strategies" text NOT NULL, "tactics" text NOT NULL, "safety_message" character varying(500) NOT NULL, "organization_chart" jsonb NOT NULL, "is_finalized" boolean NOT NULL DEFAULT false, "prepared_at" TIMESTAMP, "finalized_at" TIMESTAMP, "client_generated_id" uuid, "emergency_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "UQ_7f583f518f97cc57b11a73b34af" UNIQUE ("client_generated_id"), CONSTRAINT "PK_a843dded2347174b3391255d326" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_form201_open_per_emergency" ON "form201" ("emergency_id") WHERE is_deleted = false AND is_finalized = false`);
        await queryRunner.query(`CREATE TABLE "charge" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "abbreviation" character varying(20), "level" integer NOT NULL, "weight" numeric(5,2) NOT NULL, "system_name" character varying(100), CONSTRAINT "UQ_96c56f7dd765e9ff873f59fbf7f" UNIQUE ("system_name"), CONSTRAINT "PK_ac0381acde3bdffe41ad57cd942" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attend" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" date NOT NULL, "hour" TIME NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "charge_system_name" character varying(100), "user_id" uuid NOT NULL, "emergency_id" uuid NOT NULL, "charge_id" uuid NOT NULL, CONSTRAINT "PK_70f2de3432dd45b41e60d9b83d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_attend_incident_commander_active" ON "attend" ("emergency_id") WHERE charge_system_name = 'incident_commander' AND is_active = true`);
        await queryRunner.query(`CREATE TABLE "equipment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "description" text, "total_quantity" integer NOT NULL, "available_quantity" integer NOT NULL, CONSTRAINT "PK_0722e1b9d6eb19f5874c1678740" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "resource" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "amount" integer NOT NULL, "note" character varying(255), "amount_returned" integer NOT NULL DEFAULT '0', "emergency_id" uuid NOT NULL, "equipment_id" uuid NOT NULL, CONSTRAINT "PK_e2894a5867e06ae2e8889f1173f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "path_audio" character varying(500) NOT NULL, "duration" numeric(8,2) NOT NULL DEFAULT '0', "processed" boolean NOT NULL DEFAULT false, "file_name" character varying(255), "mime_type" character varying(50), "size_bytes" bigint, "transcription" text, "nlp_extracted_data" jsonb, "client_generated_id" uuid, "user_id" uuid NOT NULL, "emergency_id" uuid NOT NULL, CONSTRAINT "UQ_6d6eeef66ab3358ef08298bfc4b" UNIQUE ("client_generated_id"), CONSTRAINT "PK_9562215b41192ae4ccdf314a789" PRIMARY KEY ("id")); COMMENT ON COLUMN "audio"."path_audio" IS 'Clave del archivo en el almacenamiento (audios/{userId}/{emergencyId}/{archivo}; los registros antiguos usan data/audios/...)'; COMMENT ON COLUMN "audio"."duration" IS 'Duración del audio en segundos'; COMMENT ON COLUMN "audio"."processed" IS 'Indica si el audio ya fue procesado por el pipeline de NLP'; COMMENT ON COLUMN "audio"."file_name" IS 'Nombre del archivo generado o recibido'; COMMENT ON COLUMN "audio"."mime_type" IS 'Formato MIME del audio (ej. audio/m4a, audio/mp3, audio/aac, audio/wav, audio/ogg)'; COMMENT ON COLUMN "audio"."size_bytes" IS 'Tamaño del archivo en bytes'; COMMENT ON COLUMN "audio"."transcription" IS 'Texto transcrito por el motor Speech-to-Text / Whisper'; COMMENT ON COLUMN "audio"."nlp_extracted_data" IS 'Entidades e intenciones estructuradas extraídas por el NLP'; COMMENT ON COLUMN "audio"."client_generated_id" IS 'Identificador único offline generado por el cliente móvil'`);
        await queryRunner.query(`CREATE TABLE "action" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "description" character varying(500) NOT NULL, "date" date NOT NULL, "hour" character varying(10) NOT NULL, "client_generated_id" uuid, "user_id" uuid NOT NULL, "emergency_id" uuid NOT NULL, "audio_id" uuid, CONSTRAINT "UQ_3e4dc9d011459e5de67688ae5e5" UNIQUE ("client_generated_id"), CONSTRAINT "REL_bc664bce150336b773dc797428" UNIQUE ("audio_id"), CONSTRAINT "PK_2d9db9cf5edfbbae74eb56e3a39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "victim" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "identifier" character varying(50), "age_estimated" integer, "gender" character varying(20), "cellphone" character varying(20), "reference_cellphone" character varying(20), "client_generated_id" uuid, CONSTRAINT "UQ_b9691707b116b0199db4c81dda8" UNIQUE ("client_generated_id"), CONSTRAINT "PK_cbd7710a474d5b794f5711232da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "health_facility" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "normalized_name" character varying(150) NOT NULL, CONSTRAINT "PK_b9f1e3a8b3c05c7d52dcabb39ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_health_facility_normalized_name" ON "health_facility" ("normalized_name") WHERE is_deleted = false`);
        await queryRunner.query(`CREATE TYPE "public"."registration_classification_enum" AS ENUM('rojo', 'amarillo', 'verde', 'negro')`);
        await queryRunner.query(`CREATE TYPE "public"."registration_transport_means_enum" AS ENUM('ambulancia', 'aereo', 'embarcacion', 'otro')`);
        await queryRunner.query(`CREATE TABLE "registration" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "classification" "public"."registration_classification_enum" NOT NULL, "transferred_by" character varying(150), "transport_means" "public"."registration_transport_means_enum", "cellphone_transfer_manager" character varying(20), "notes" character varying(500), "date" date NOT NULL, "hour" character varying(10) NOT NULL, "client_generated_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "transfer_destination_id" uuid, "victim_id" uuid NOT NULL, "form207_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "UQ_01de7d1dc602784795fa8b07f8c" UNIQUE ("client_generated_id"), CONSTRAINT "PK_cb23dc9d28df8801b15e9e2b8d6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "form207" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(15) NOT NULL, "place_of_registration" character varying(255) NOT NULL, "attendant" character varying(150) NOT NULL, "date" date NOT NULL, "is_finalized" boolean NOT NULL DEFAULT false, "client_generated_id" uuid, "emergency_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "UQ_3c77c258d1a841c33b5bc43fdee" UNIQUE ("client_generated_id"), CONSTRAINT "PK_9eecabb7186f9496914d205af3e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "initial_assessment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "hazard_type" character varying(100) NOT NULL, "nature_of_incident" character varying(100), "threats" text, "affected_area" character varying(100), "isolation" character varying(100), "severity_level" character varying(20), "affected_people_estimated" integer, "situation_description" text, "weather_conditions" character varying(100), CONSTRAINT "PK_ce173a3c6018194c412b08bf704" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "emergency" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "location_description" character varying(255), "date" character varying NOT NULL, "hour" character varying NOT NULL, "type" character varying(50) NOT NULL, "coordinates" text, "coordinates_pc" text, "coordinates_e" text, "state" character varying(1) NOT NULL DEFAULT 'p', "duration" character varying(50) NOT NULL DEFAULT '', "timezone" character varying(64) NOT NULL DEFAULT 'America/La_Paz', "initial_assessment_id" uuid, "user_id" uuid, CONSTRAINT "UQ_1457cc4fbe645086b95f571ae02" UNIQUE ("code"), CONSTRAINT "REL_91335b29083f0e21beaac145ba" UNIQUE ("initial_assessment_id"), CONSTRAINT "PK_577f3349535b2d39704154478d1" PRIMARY KEY ("id")); COMMENT ON COLUMN "emergency"."coordinates" IS 'Array with latitude and longitude'; COMMENT ON COLUMN "emergency"."coordinates_pc" IS 'Array with longitude and latitude'; COMMENT ON COLUMN "emergency"."coordinates_e" IS 'Array with longitude and latitude'`);
        await queryRunner.query(`CREATE TABLE "refresh_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "token_hash" character varying(255) NOT NULL, "is_revoked" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "auth_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "token_hash" character varying(255) NOT NULL, "type" character varying(50) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "user_id" uuid NOT NULL, CONSTRAINT "PK_4572ff5d1264c4a523f01aa86a0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('basic', 'advanced', 'manager', 'admin', 'suadmin')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "password" character varying(255) NOT NULL, "cellphone" character varying(20), "email" character varying(100) NOT NULL, "grade" character varying(50), "birthdate" date, "url_image" character varying, "is_active" boolean NOT NULL DEFAULT false, "is_operational" boolean NOT NULL DEFAULT true, "role" "public"."user_role_enum" NOT NULL DEFAULT 'basic', CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(30) NOT NULL, "title" character varying(100) NOT NULL, "message" character varying(255) NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "device_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "token" character varying(255) NOT NULL, "device_os" character varying(20) NOT NULL DEFAULT 'android', "user_id" uuid NOT NULL, CONSTRAINT "UQ_d959c11311d3002e4bb10d9edbd" UNIQUE ("token"), CONSTRAINT "PK_592ce89b9ea1a268d6140f60422" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_role" character varying(50), "event_type" character varying(20) NOT NULL, "entity_name" character varying(100) NOT NULL, "entity_id" uuid, "old_values" jsonb, "new_values" jsonb, "ip_address" character varying(45), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "emergency_form207_counter" ("emergency_id" uuid NOT NULL, "last_value" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_8d8fd6141aa9e8f63c3d157335d" PRIMARY KEY ("emergency_id"))`);
        await queryRunner.query(`CREATE TABLE "data_fires" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "temperature" double precision, "relative_humidity" double precision, "wind_speed" double precision, "cause" character varying, "emergency_id" uuid NOT NULL, CONSTRAINT "REL_11595f8b80211ad0285ecad49e" UNIQUE ("emergency_id"), CONSTRAINT "PK_d508958286f371e32c4ce7d94c1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "form201" ADD CONSTRAINT "FK_31f7f7c5f8e701fedf4db083012" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form201" ADD CONSTRAINT "FK_844f82fc4a51e691c8b98dd28e2" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attend" ADD CONSTRAINT "FK_2fbd650a01e4eecd4523065b58d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attend" ADD CONSTRAINT "FK_af0ae7bb1f339197dea738cc4dc" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attend" ADD CONSTRAINT "FK_acb8350823ca4a01b634cffea55" FOREIGN KEY ("charge_id") REFERENCES "charge"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resource" ADD CONSTRAINT "FK_3185fbbbf4a5de655881e35d614" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resource" ADD CONSTRAINT "FK_d5ce211b8a4a24030f25c7575ec" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audio" ADD CONSTRAINT "FK_aa3b08bd9f87191cf8b6bf6ffe1" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audio" ADD CONSTRAINT "FK_657188d5689c06a7bcb1d7c7316" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "action" ADD CONSTRAINT "FK_7b399dc5cde63184cedc81df36e" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "action" ADD CONSTRAINT "FK_f960c6426de53224d1ee308c1cb" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "action" ADD CONSTRAINT "FK_bc664bce150336b773dc7974287" FOREIGN KEY ("audio_id") REFERENCES "audio"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registration" ADD CONSTRAINT "FK_bbe1e158657c373d6fffaaf9458" FOREIGN KEY ("transfer_destination_id") REFERENCES "health_facility"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registration" ADD CONSTRAINT "FK_8d640ba66bd5b10013ec2136302" FOREIGN KEY ("victim_id") REFERENCES "victim"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registration" ADD CONSTRAINT "FK_076e6afa763eb3df9d58e474618" FOREIGN KEY ("form207_id") REFERENCES "form207"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registration" ADD CONSTRAINT "FK_7df145ec10b504c38049e3253d4" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form207" ADD CONSTRAINT "FK_52725c66d6685c34ab05c2bc510" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form207" ADD CONSTRAINT "FK_c85366b709f8d1714e2482403c3" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "emergency" ADD CONSTRAINT "FK_91335b29083f0e21beaac145ba9" FOREIGN KEY ("initial_assessment_id") REFERENCES "initial_assessment"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "emergency" ADD CONSTRAINT "FK_d49f995cf23ef6350da037895ca" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_6bbe63d2fe75e7f0ba1710351d4" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth_token" ADD CONSTRAINT "FK_26b580c89e141c75426f44317bc" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_928b7aa1754e08e1ed7052cb9d8" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "device_token" ADD CONSTRAINT "FK_aca74edfcfd458e0cb313e9d099" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD CONSTRAINT "FK_cb11bd5b662431ea0ac455a27d7" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "data_fires" ADD CONSTRAINT "FK_11595f8b80211ad0285ecad49e9" FOREIGN KEY ("emergency_id") REFERENCES "emergency"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "data_fires" DROP CONSTRAINT "FK_11595f8b80211ad0285ecad49e9"`);
        await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT "FK_cb11bd5b662431ea0ac455a27d7"`);
        await queryRunner.query(`ALTER TABLE "device_token" DROP CONSTRAINT "FK_aca74edfcfd458e0cb313e9d099"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_928b7aa1754e08e1ed7052cb9d8"`);
        await queryRunner.query(`ALTER TABLE "auth_token" DROP CONSTRAINT "FK_26b580c89e141c75426f44317bc"`);
        await queryRunner.query(`ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_6bbe63d2fe75e7f0ba1710351d4"`);
        await queryRunner.query(`ALTER TABLE "emergency" DROP CONSTRAINT "FK_d49f995cf23ef6350da037895ca"`);
        await queryRunner.query(`ALTER TABLE "emergency" DROP CONSTRAINT "FK_91335b29083f0e21beaac145ba9"`);
        await queryRunner.query(`ALTER TABLE "form207" DROP CONSTRAINT "FK_c85366b709f8d1714e2482403c3"`);
        await queryRunner.query(`ALTER TABLE "form207" DROP CONSTRAINT "FK_52725c66d6685c34ab05c2bc510"`);
        await queryRunner.query(`ALTER TABLE "registration" DROP CONSTRAINT "FK_7df145ec10b504c38049e3253d4"`);
        await queryRunner.query(`ALTER TABLE "registration" DROP CONSTRAINT "FK_076e6afa763eb3df9d58e474618"`);
        await queryRunner.query(`ALTER TABLE "registration" DROP CONSTRAINT "FK_8d640ba66bd5b10013ec2136302"`);
        await queryRunner.query(`ALTER TABLE "registration" DROP CONSTRAINT "FK_bbe1e158657c373d6fffaaf9458"`);
        await queryRunner.query(`ALTER TABLE "action" DROP CONSTRAINT "FK_bc664bce150336b773dc7974287"`);
        await queryRunner.query(`ALTER TABLE "action" DROP CONSTRAINT "FK_f960c6426de53224d1ee308c1cb"`);
        await queryRunner.query(`ALTER TABLE "action" DROP CONSTRAINT "FK_7b399dc5cde63184cedc81df36e"`);
        await queryRunner.query(`ALTER TABLE "audio" DROP CONSTRAINT "FK_657188d5689c06a7bcb1d7c7316"`);
        await queryRunner.query(`ALTER TABLE "audio" DROP CONSTRAINT "FK_aa3b08bd9f87191cf8b6bf6ffe1"`);
        await queryRunner.query(`ALTER TABLE "resource" DROP CONSTRAINT "FK_d5ce211b8a4a24030f25c7575ec"`);
        await queryRunner.query(`ALTER TABLE "resource" DROP CONSTRAINT "FK_3185fbbbf4a5de655881e35d614"`);
        await queryRunner.query(`ALTER TABLE "attend" DROP CONSTRAINT "FK_acb8350823ca4a01b634cffea55"`);
        await queryRunner.query(`ALTER TABLE "attend" DROP CONSTRAINT "FK_af0ae7bb1f339197dea738cc4dc"`);
        await queryRunner.query(`ALTER TABLE "attend" DROP CONSTRAINT "FK_2fbd650a01e4eecd4523065b58d"`);
        await queryRunner.query(`ALTER TABLE "form201" DROP CONSTRAINT "FK_844f82fc4a51e691c8b98dd28e2"`);
        await queryRunner.query(`ALTER TABLE "form201" DROP CONSTRAINT "FK_31f7f7c5f8e701fedf4db083012"`);
        await queryRunner.query(`DROP TABLE "data_fires"`);
        await queryRunner.query(`DROP TABLE "emergency_form207_counter"`);
        await queryRunner.query(`DROP TABLE "audit_log"`);
        await queryRunner.query(`DROP TABLE "device_token"`);
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP TABLE "auth_token"`);
        await queryRunner.query(`DROP TABLE "refresh_token"`);
        await queryRunner.query(`DROP TABLE "emergency"`);
        await queryRunner.query(`DROP TABLE "initial_assessment"`);
        await queryRunner.query(`DROP TABLE "form207"`);
        await queryRunner.query(`DROP TABLE "registration"`);
        await queryRunner.query(`DROP TYPE "public"."registration_transport_means_enum"`);
        await queryRunner.query(`DROP TYPE "public"."registration_classification_enum"`);
        await queryRunner.query(`DROP INDEX "public"."uq_health_facility_normalized_name"`);
        await queryRunner.query(`DROP TABLE "health_facility"`);
        await queryRunner.query(`DROP TABLE "victim"`);
        await queryRunner.query(`DROP TABLE "action"`);
        await queryRunner.query(`DROP TABLE "audio"`);
        await queryRunner.query(`DROP TABLE "resource"`);
        await queryRunner.query(`DROP TABLE "equipment"`);
        await queryRunner.query(`DROP INDEX "public"."uq_attend_incident_commander_active"`);
        await queryRunner.query(`DROP TABLE "attend"`);
        await queryRunner.query(`DROP TABLE "charge"`);
        await queryRunner.query(`DROP INDEX "public"."uq_form201_open_per_emergency"`);
        await queryRunner.query(`DROP TABLE "form201"`);
    }

}
