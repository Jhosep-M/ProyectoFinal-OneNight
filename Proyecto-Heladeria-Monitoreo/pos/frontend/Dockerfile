# =============================================================================
# POS frontend — Dockerfile multi-stage (Persona 4 / Task 6)
# Build context: pos/frontend
#   docker build -t pos-frontend:local ./pos/frontend
# NOTA: package.json / vite.config.js están VACÍOS (scaffold, P1 los completa).
# Este Dockerfile es válido en cuanto exista script `build` de Vite que genere
# `dist/`. Sirve con nginx en puerto 80 interno (mapeado a 5173 en compose).
# runtime: nginx:alpine (no node en runtime).
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# URL del backend POS inyectada en tiempo de build (Vite la congela en el bundle).
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
# Config SPA: fallback a index.html + cache largo para assets con hash.
RUN printf 'server {\n\
  listen 80;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / { try_files $uri $uri/ /index.html; }\n\
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }\n\
}\n' > /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
