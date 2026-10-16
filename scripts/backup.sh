#!/usr/bin/env bash
# Respaldo de SCI: base PostgreSQL (pg_dump, formato custom) + archivos (fotos, croquis, audios).
#
# Uso:   scripts/backup.sh [ruta/al/.env]
# Cron:  15 3 * * *  cd /opt/sci/back-sci && scripts/backup.sh .env >> /var/log/sci-backup.log 2>&1
#
# Lee del .env solo DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE y STORAGE_LOCAL_ROOT
# (sin ejecutarlo: un valor con espacios o comillas no se interpreta como código).
# Variables opcionales: BACKUP_DIR (por defecto ./backups), BACKUP_RETENTION_DAYS (14) y PG_BIN
# (carpeta de pg_dump si no está en el PATH).
# Deja, por corrida: db-<fecha>.dump, files-<fecha>.tar.gz y SHA256SUMS-<fecha>.
set -euo pipefail

ENV_FILE="${1:-.env}"
[[ -f "$ENV_FILE" ]] || { echo "No existe $ENV_FILE" >&2; exit 1; }

env_get() { # valor de una clave del .env, sin comillas exteriores
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
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
PG_DUMP="${PG_BIN:+$PG_BIN/}pg_dump"

[[ -n "$DB_NAME" && -n "$DB_USER" ]] || { echo "Faltan DB_DATABASE o DB_USERNAME en $ENV_FILE" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true
umask 077

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
FILES_FILE="$BACKUP_DIR/files-$STAMP.tar.gz"

echo "[$(date -u +%FT%TZ)] Respaldando base $DB_NAME..."
"$PG_DUMP" --format=custom --no-owner --no-privileges \
  --host="${DB_HOST:-localhost}" --port="${DB_PORT:-5432}" --username="$DB_USER" \
  --file="$DB_FILE" "$DB_NAME"

echo "[$(date -u +%FT%TZ)] Respaldando archivos de $STORAGE_ROOT..."
if [[ -d "$STORAGE_ROOT" ]]; then
  tar -czf "$FILES_FILE" -C "$STORAGE_ROOT" .
else
  echo "  (no existe $STORAGE_ROOT: se guarda un archivo vacío)"
  tar -czf "$FILES_FILE" --files-from /dev/null
fi

( cd "$BACKUP_DIR" && sha256sum "$(basename "$DB_FILE")" "$(basename "$FILES_FILE")" > "SHA256SUMS-$STAMP" )

# Retención: borra respaldos de más de N días (solo los que genera este script).
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'files-*.tar.gz' -o -name 'SHA256SUMS-*' \) \
  -mtime "+$RETENTION_DAYS" -print -delete

echo "[$(date -u +%FT%TZ)] Listo: $DB_FILE ($(du -h "$DB_FILE" | cut -f1)), $FILES_FILE ($(du -h "$FILES_FILE" | cut -f1))"
