# ---- Etapa de construcción ----
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN node -e "require('node:fs').writeFileSync('dist/frontend/browser/app-version.txt', require('./package.json').version)"

# ---- Etapa de servido con Nginx ----
FROM nginx:alpine

# Copiar la build de Angular al directorio público de Nginx
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

# Configuración de Nginx para SPA (redirige todo a index.html)
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
