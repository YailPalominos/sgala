#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_PATH="$ROOT_DIR/.env"
BACKEND_ENV_PATH="$ROOT_DIR/backend/.env"

if [ ! -f "$BACKEND_ENV_PATH" ]; then
  echo "No se encuentra backend/.env. Se cancela el despliegue para proteger la configuracion del proyecto." >&2
  exit 1
fi

get_env_value() {
  local file_path="$1"
  local key="$2"
  local line value

  if [ ! -f "$file_path" ]; then
    printf ''
    return
  fi

  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file_path" | head -n 1 || true)"
  value="${line#*=}"
  value="${value%$'\r'}"
  value="${value#\"}"
  value="${value%\"}"
  printf '%s' "$value"
}

for nombre_puerto in PUERTO_API PUERTO_BROKER PUERTO_SOCKET; do
  valor_puerto="$(get_env_value "$BACKEND_ENV_PATH" "$nombre_puerto")"
  if [[ ! "$valor_puerto" =~ ^[0-9]+$ ]] || (( 10#$valor_puerto < 1 || 10#$valor_puerto > 65535 )); then
    echo "No existe un valor válido para $nombre_puerto en backend/.env; no se puede desplegar sin ese puerto." >&2
    exit 1
  fi
  printf -v "$nombre_puerto" '%d' "$((10#$valor_puerto))"
done

generate_password() {
  local password
  while true; do
    password="$(openssl rand -base64 32 | tr -d '\n' | tr '+/' '-_' | tr -d '=')"
    if [[ "$password" =~ [A-Z] && "$password" =~ [a-z] && "$password" =~ [0-9] ]]; then
      printf '%s' "$password"
      return
    fi
  done
}

validar_enlace_servidor() {
  local enlace="$1"
  local etiqueta

  if [[ "$enlace" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    IFS='.' read -r -a octetos <<< "$enlace"
    for etiqueta in "${octetos[@]}"; do
      (( etiqueta >= 0 && etiqueta <= 255 )) || return 1
    done
    return 0
  fi

  [[ ${#enlace} -le 253 && "$enlace" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] || return 1
  IFS='.' read -r -a etiquetas <<< "$enlace"
  for etiqueta in "${etiquetas[@]}"; do
    [[ ${#etiqueta} -le 63 && "$etiqueta" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$ ]] || return 1
  done
}

read -r -p "Dominio o IPv4 para ENLACE_SERVIDOR: " ENLACE_SERVIDOR
if ! validar_enlace_servidor "$ENLACE_SERVIDOR"; then
  echo "El enlace debe ser un dominio o una dirección IPv4 válida." >&2
  exit 1
fi

DIRECTORIO_HOST=""
read -r -p "Directorio persistente para certificados y archivos [/sgala-archivos]: " DIRECTORIO_HOST
if [ -z "$DIRECTORIO_HOST" ]; then
  DIRECTORIO_HOST="/sgala-archivos"
fi
mkdir -p -- "$DIRECTORIO_HOST"
DIRECTORIO_HOST="$(cd -- "$DIRECTORIO_HOST" && pwd -P)"
if [ ! -d "$DIRECTORIO_HOST" ]; then
  echo "No se pudo crear el directorio persistente: $DIRECTORIO_HOST" >&2
  exit 1
fi

SQL_SA_PASSWORD="$(get_env_value "$ENV_PATH" "MSSQL_SA_PASSWORD")"
if [ -z "$SQL_SA_PASSWORD" ]; then
  SQL_SA_PASSWORD="$(generate_password)"
fi

REDIS_PASSWORD="$(get_env_value "$ENV_PATH" "REDIS_PASSWORD")"
if [ -z "$REDIS_PASSWORD" ]; then
  REDIS_PASSWORD="$(generate_password)"
fi

TEMP_ENV="$(mktemp)"
if [ -f "$ENV_PATH" ]; then
  grep -Ev '^[[:space:]]*(MSSQL_SA_PASSWORD|REDIS_PASSWORD|ENLACE_SERVIDOR|DIRECTORIO_HOST|DIRECTORIO|PUERTO_API|PUERTO_BROKER|PUERTO_SOCKET|VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY)=' "$ENV_PATH" > "$TEMP_ENV" || true
fi
printf 'MSSQL_SA_PASSWORD="%s"\nREDIS_PASSWORD="%s"\nENLACE_SERVIDOR="%s"\nDIRECTORIO_HOST="%s"\nDIRECTORIO="/archivos"\nPUERTO_API="%s"\nPUERTO_BROKER="%s"\nPUERTO_SOCKET="%s"\nVAPID_PUBLIC_KEY="pendiente"\nVAPID_PRIVATE_KEY="pendiente"\n' "$SQL_SA_PASSWORD" "$REDIS_PASSWORD" "$ENLACE_SERVIDOR" "$DIRECTORIO_HOST" "$PUERTO_API" "$PUERTO_BROKER" "$PUERTO_SOCKET" >> "$TEMP_ENV"
mv "$TEMP_ENV" "$ENV_PATH"

printf '%s\n' 'Generando claves VAPID nuevas...'
cd "$ROOT_DIR"
docker compose build backend
VAPID_KEYS="$(docker compose run --rm --no-deps backend node -e 'const k=require(String.fromCharCode(119,101,98,45,112,117,115,104)).generateVAPIDKeys(); console.log(k.publicKey); console.log(k.privateKey);')"
VAPID_PUBLIC_KEY="$(printf '%s\n' "$VAPID_KEYS" | sed -n '1p')"
VAPID_PRIVATE_KEY="$(printf '%s\n' "$VAPID_KEYS" | sed -n '2p')"
if [ -z "$VAPID_PUBLIC_KEY" ] || [ -z "$VAPID_PRIVATE_KEY" ]; then
  echo "No se pudieron generar las claves VAPID." >&2
  exit 1
fi
TEMP_ENV="$(mktemp)"
grep -Ev '^[[:space:]]*VAPID_(PUBLIC|PRIVATE)_KEY=' "$ENV_PATH" > "$TEMP_ENV" || true
printf 'VAPID_PUBLIC_KEY="%s"\nVAPID_PRIVATE_KEY="%s"\n' "$VAPID_PUBLIC_KEY" "$VAPID_PRIVATE_KEY" >> "$TEMP_ENV"
mv "$TEMP_ENV" "$ENV_PATH"

printf '%s\n' 'Generando certificados TLS en el volumen seleccionado...'
docker compose run --rm --no-deps backend node -r ts-node/register -r tsconfig-paths/register -e 'require(String.fromCharCode(46,47,115,114,99,47,115,101,114,118,105,99,105,111,115,47,99,101,114,116,105,102,105,99,97,100,111,115,46,115,101,114,118,105,99,105,111)).asegurarCertificadosServidor()'

printf '%s\n' 'Configuración de despliegue lista. backend/.env se conserva sin cambios.'
printf '%s\n' 'Recreando SQL Server para aplicar entrypoint.sh actualizado...'
if ! docker compose up -d --force-recreate sqlserver; then
  printf '%s\n' 'No se pudo iniciar SQL Server. Logs recientes:' >&2
  docker compose logs --tail=100 sqlserver >&2 || true
  exit 1
fi

printf '%s\n' 'Iniciando docker compose up --build -d...'
if ! docker compose up --build -d; then
  printf '%s\n' 'El despliegue falló. Logs recientes de SQL Server:' >&2
  docker compose logs --tail=100 sqlserver >&2 || true
  exit 1
fi
