#!/bin/bash
set -e

# Arranca SQL Server en segundo plano.
/opt/mssql/bin/sqlservr &
PID_SQL=$!

# Ruta de sqlcmd según la versión de la imagen.
if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then
  SQLCMD=/opt/mssql-tools18/bin/sqlcmd
  OPCIONES_TLS="-C"
else
  SQLCMD=/opt/mssql-tools/bin/sqlcmd
  OPCIONES_TLS=""
fi

echo "⏳ Esperando a que SQL Server acepte conexiones..."

# Esperar hasta que SQL Server responda (máx. 60 intentos ~ 60s).
for i in $(seq 1 60); do
  if $SQLCMD -S localhost -U sa -P "$MSSQL_SA_PASSWORD" $OPCIONES_TLS -Q "SELECT 1" > /dev/null 2>&1; then
    echo "✅ SQL Server listo."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "❌ SQL Server no respondió a tiempo."
    exit 1
  fi
  sleep 1
done

# Ejecutar el script de inicialización una sola vez.
if [ ! -f /var/opt/mssql/.init-ejecutado ]; then
  echo "📜 Ejecutando init.sql..."
  $SQLCMD -S localhost -U sa -P "$MSSQL_SA_PASSWORD" $OPCIONES_TLS -i /usr/src/init.sql
  touch /var/opt/mssql/.init-ejecutado
  echo "✅ init.sql ejecutado."
else
  echo "ℹ️ init.sql ya se había ejecutado anteriormente, se omite."
fi

# Mantener el contenedor vivo con el proceso de SQL Server en primer plano.
wait $PID_SQL
