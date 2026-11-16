#!/usr/bin/env bash
# Crea /srv/sci/.env con secretos nuevos y aleatorios, y las carpetas de datos.
# Es idempotente: si el .env ya existe no lo toca (así no se pierden las claves en uso).
#
#   sudo bash preparar-servidor.sh
set -euo pipefail

RAIZ=/srv/sci
ENV_FILE="$RAIZ/.env"
clave() { openssl rand -base64 36 | tr -d '/+=' | head -c 40; }

mkdir -p "$RAIZ"/datos/{postgres,demo,test,fru}
# El usuario `node` de la imagen de la API (uid 1000) escribe los archivos subidos.
chown -R 1000:1000 "$RAIZ"/datos/{demo,test,fru}

if [[ -f "$ENV_FILE" ]]; then
  echo "Ya existe $ENV_FILE: no se toca."
  exit 0
fi

{
  echo "# Generado por preparar-servidor.sh el $(date -Is). Contiene secretos."
  echo "POSTGRES_PASSWORD=$(clave)"
  for inst in DEMO TEST FRU; do
    echo
    echo "# --- $inst ---"
    echo "${inst}_DB_PASSWORD=$(clave)"
    echo "${inst}_JWT_AUTH=$(clave)"
    echo "${inst}_JWT_RECOVERY=$(clave)"
    echo "${inst}_JWT_REFRESH=$(clave)"
    echo "${inst}_ADMIN_PASSWORD=$(clave)"
  done
} > "$ENV_FILE"

chmod 640 "$ENV_FILE"
echo "Creado $ENV_FILE. Falta agregar los correos de los administradores:"
echo "  DEMO_ADMIN_EMAIL=, TEST_ADMIN_EMAIL=, FRU_ADMIN_EMAIL="
