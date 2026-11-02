# Etapa 1: compila la app Angular
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# URL del backend. Se fija al compilar porque Angular la mete en el bundle.
ARG API_URL=https://psoas-backend.onrender.com
# URL del asistente de IA. Vacía = la pestaña "Asistente" no aparece.
ARG AI_URL=
RUN sed -i "s|baseUrl: '.*'|baseUrl: '${API_URL}'|; s|aiUrl: '.*'|aiUrl: '${AI_URL}'|" src/environments/environment.production.ts \
 && npm run build

# Etapa 2: sirve los archivos estáticos con nginx
FROM nginx:1.27-alpine
# Origen del API para la CSP (connect-src). Se puede cambiar al arrancar sin recompilar:
#   docker run -e API_ORIGIN=https://api.ejemplo.com ...
ARG API_URL=https://psoas-backend.onrender.com
ENV API_ORIGIN=${API_URL}
# Lo mismo para el asistente de IA (vacío si no hay asistente).
ARG AI_URL=
ENV AI_ORIGIN=${AI_URL}
# Las plantillas de /etc/nginx/templates se procesan al arrancar (envsubst).
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx/ /etc/nginx/templates/
COPY --from=build /app/dist/psoas/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
