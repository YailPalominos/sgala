# Imagen del backend (Node + TypeScript + Prisma)
FROM node:20-slim

# openssl es requerido por Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias (el postinstall ejecuta prisma generate)
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# Copiar el código fuente
COPY . .

# Puertos: API, broker MQTT, socket
EXPOSE 3000 4060 4061

CMD ["npm", "run", "start"]
