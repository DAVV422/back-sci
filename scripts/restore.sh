#!/usr/bin/env bash
# Restaura un respaldo de scripts/backup.sh.
#
# Uso:  scripts/restore.sh <.env> <db-AAAAMMDDTHHMMSSZ.dump> [files-….tar.gz] --target <base> --yes
#
# - Restaura sobre la base indicada en --target (la crea si no existe). Si es la misma del .env,
#   detén antes el backend: se reemplaza su contenido (pg_restore --clean).
# - Verifica primero las sumas SHA256 si está el archivo SHA256SUMS de la misma corrida.
# - Si se pasa el .tar.gz, lo extrae en STORAGE_LOCAL_ROOT (o <carpeta del .env>/data). Solo con
#   --target igual a la base del .env, para no mezclar archivos de otra base.
# Para probar un respaldo sin tocar nada: --target sci_restore_test (y luego bórrala).
set -euo pipefail

ENV_FILE=""; DB_FILE=""; FILES_FILE=""; TARGET=""; CONFIRMED=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    --yes) CONFIRMED=1; shift ;;
    *) if [[ -z "$ENV_FILE" ]]; then ENV_FILE="$1"; elif [[ -z "$DB_FILE" ]]; then DB_FILE="$1"; else FILES_FILE="$1"; fi; shift ;;
  esac
done
[[ -f "$ENV_FILE" && -f "$DB_FILE" && -n "$TARGET" ]] || { sed -n '2,12p' "$0"; exit 1; }
[[ "$TARGET" =~ ^[a-z_][a-z0-9_]*$ ]] || { echo "Nombre de base inválido: $TARGET" >&2; exit 1; }
[[ $CONFIRMED -eq 1 ]] || { echo "Agrega --yes para confirmar que se reemplaza el contenido de $TARGET." >&2; exit 1; }

env_get() {
  local line
  line="$(grep -E "^[[:space:]]*$1[[:space:]]*=" "$ENV_FILE" | tail -n 1 || true)"
  line="${line#*=}"; line="${line%$'\r'}"
  line="${line#"${line%%[![:space:]]*}"}"; line="${line%"${line##*[![:space:]]}"}"
  [[ "$line" =~ ^\"(.*)\"$ || "$line" =~ ^\'(.*)\'$ ]] && line="${BASH_REMATCH[1]}"
  printf '%s' "$line"
}

DB_HOST="$(env_get DB_HOST)"; DB_PORT="$(env_get DB_PORT)"; DB_USER="$(env_get DB_USERNAME)"
DB_NAME="$(env_get DB_DATABASE)"; STORAGE_ROOT="$(env_get STORAGE_LOCAL_ROOT)"
export PGPASSWORD="$(env_get DB_PASSWORD)"
STORAGE_ROOT="${STORAGE_ROOT:-$(dirname "$ENV_FILE")/data}"
BIN="${PG_BIN:+$PG_BIN/}"
CONN=(--host="${DB_HOST:-localhost}" --port="${DB_PORT:-5432}" --username="$DB_USER")

SUMS="$(dirname "$DB_FILE")/SHA256SUMS-$(basename "$DB_FILE" .dump | sed 's/^db-//')"
if [[ -f "$SUMS" ]]; then
  echo "Verificando sumas SHA256..."
  ( cd "$(dirname "$DB_FILE")" && sha256sum --check --ignore-missing "$(basename "$SUMS")" )
fi

# Un pg_restore más nuevo que el servidor emite parámetros que este no conoce (p. ej. el 17
# escribe `SET transaction_timeout`, que el 16 rechaza). Usar las herramientas de la misma versión.
SERVER_MAJOR="$(( $("${BIN}psql" "${CONN[@]}" -d postgres -tAc 'SHOW server_version_num') / 10000 ))"
CLIENT_MAJOR="$("${BIN}pg_restore" --version | grep -oE '[0-9]+' | head -n 1)"
if (( CLIENT_MAJOR > SERVER_MAJOR )); then
  echo "pg_restore $CLIENT_MAJOR es más nuevo que el servidor PostgreSQL $SERVER_MAJOR: usa las herramientas de la versión $SERVER_MAJOR (PG_BIN)." >&2
  exit 1
fi

if [[ -z "$("${BIN}psql" "${CONN[@]}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$TARGET'")" ]]; then
  echo "Creando la base $TARGET..."
  "${BIN}psql" "${CONN[@]}" -d postgres -c "CREATE DATABASE $TARGET" > /dev/null
fi

echo "Restaurando $(basename "$DB_FILE") en $TARGET..."
"${BIN}pg_restore" "${CONN[@]}" --dbname="$TARGET" --clean --if-exists --no-owner --no-privileges --exit-on-error "$DB_FILE"

if [[ -n "$FILES_FILE" ]]; then
  if [[ "$TARGET" != "$DB_NAME" ]]; then
    echo "Archivos no restaurados: --target ($TARGET) no es la base del .env ($DB_NAME)."
  else
    echo "Restaurando archivos en $STORAGE_ROOT..."
    mkdir -p "$STORAGE_ROOT"
    tar -xzf "$FILES_FILE" -C "$STORAGE_ROOT"
  fi
fi
echo "Restauración completa en $TARGET."
