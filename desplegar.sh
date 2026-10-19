#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_PATH="$ROOT_DIR/.env"
BACKEND_ENV_PATH="$ROOT_DIR/backend/.env"

if [ ! -f "$BACKEND_ENV_PATH" ]; then
  echo "No se encuentra backend/.env. Se cancela el despliegue para proteger la configuracion del proyecto." >&2
  exit 1
fi

generate_password() {
  openssl rand -base64 32 | tr -d '\n' | tr '+/' '-_' | tr -d '='
}

get_env_value() {
  local file_path="$1"
  local key="$2"
  local line value

  if [ ! -f "$file_path" ]; then
    printf ''
    return
  fi

  line="$(grep -E "^${key}=" "$file_path" | head -n 1 || true)"
  value="${line#*=}"
  value="${value%$'\r'}"
  value="${value#\"}"
  value="${value%\"}"
  printf '%s' "$value"
}

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
  grep -Ev '^[[:space:]]*(MSSQL_SA_PASSWORD|REDIS_PASSWORD)=' "$ENV_PATH" > "$TEMP_ENV" || true
fi
printf 'MSSQL_SA_PASSWORD="%s"\nREDIS_PASSWORD="%s"\n' "$SQL_SA_PASSWORD" "$REDIS_PASSWORD" >> "$TEMP_ENV"
mv "$TEMP_ENV" "$ENV_PATH"

printf '%s\n' 'Secretos de contenedores listos. backend/.env se conserva sin cambios.'
printf '%s\n' 'Iniciando docker compose up --build -d...'
cd "$ROOT_DIR"
docker compose up --build -d
