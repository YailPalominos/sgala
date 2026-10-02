# ---- Etapa de construcción ----
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Etapa de servido con Nginx ----
FROM nginx:alpine

# Copiar la build de Angular al directorio público de Nginx
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Configuración de Nginx para SPA (redirige todo a index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
