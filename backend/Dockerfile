# Imagen del backend (Node + TypeScript + Prisma)
FROM node:20-bookworm

# La variante completa incluye OpenSSL, requerido por Prisma en tiempo de ejecución.
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
