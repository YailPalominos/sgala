#!/bin/sh
set -eu

host="${ENLACE_SERVIDOR:-}"
case "$host" in
  ''|*[!A-Za-z0-9.-]*) echo 'ENLACE_SERVIDOR falta o no es válido para generar runtime-config.js.' >&2; exit 1 ;;
esac

api="${PUERTO_API:-}"
broker="${PUERTO_BROKER:-}"
socket="${PUERTO_SOCKET:-}"
for puerto in "$api" "$broker" "$socket"; do
  case "$puerto" in ''|*[!0-9]*) echo 'Falta un puerto válido para generar runtime-config.js.' >&2; exit 1 ;; esac
done

version="$(cat /usr/share/nginx/html/app-version.txt)"
cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.SGALA_CONFIG = Object.freeze({
  apiUrl: "https://${host}/api/",
  socketUrl: "https://${host}/socket",
  socketPath: "/sgala/socket.io",
  agentSocketUrl: "https://${host}",
  agentSocketPath: "/socket.io",
  version: "${version}",
  puertos: { api: ${api}, broker: ${broker}, socket: ${socket} }
});
EOF
