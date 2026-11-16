#!/bin/bash
# Una base y un rol por institución: cada copia del SCI solo ve sus datos. Se ejecuta una sola
# vez, cuando el volumen de Postgres está vacío.
set -euo pipefail

crear_institucion() {
  local nombre="$1" clave="$2"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE ROLE "sci_${nombre}" LOGIN PASSWORD '${clave}';
    CREATE DATABASE "sci_${nombre}" OWNER "sci_${nombre}";
EOSQL
  # uuid-ossp lo necesitan las migraciones (uuid_generate_v4) y solo lo instala un superusuario.
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "sci_${nombre}" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    REVOKE ALL ON SCHEMA public FROM PUBLIC;
    GRANT ALL ON SCHEMA public TO "sci_${nombre}";
EOSQL
}

crear_institucion demo "$DEMO_PASSWORD"
crear_institucion test "$TEST_PASSWORD"
crear_institucion fru "$FRU_PASSWORD"
