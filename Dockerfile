# Etapa 1: compila la app Angular
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# URL del backend. Se fija al compilar porque Angular la mete en el bundle.
ARG API_URL=https://psoas-backend.onrender.com
RUN sed -i "s|baseUrl: '.*'|baseUrl: '${API_URL}'|" src/environments/environment.production.ts \
 && npm run build

# Etapa 2: sirve los archivos estáticos con nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/psoas/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
