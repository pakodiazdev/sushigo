# ====== STAGE 1: Build (transpile) ======
FROM node:20-alpine AS build
WORKDIR /app

# Instala deps primero (mejor cache)
COPY ./code/webapp/package.json ./code/webapp/package-lock.json* ./code/webapp/pnpm-lock.yaml* ./code/webapp/yarn.lock* ./

# Usa el instalador correcto según tu lockfile
RUN \
    if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm i; fi

# Copia el resto del código
COPY ./code/webapp .

# ARG para la URL de la API
ARG VITE_API_URL=http://localhost:8080/api/v1

# Crear archivo .env con la URL de la API
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env

# Construir la aplicación (Vite leerá el .env automáticamente)
RUN npm run build


# ====== STAGE 2: Nginx (serve static) ======
FROM nginx:1.27-alpine AS runtime

# Config opcional SPA
COPY docker/nginx/prod/nginx.conf /etc/nginx/conf.d/default.conf

# Copia el build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
