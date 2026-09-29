# =============================================================================
# Monitoreo frontend — Dockerfile multi-stage (Persona 4 / Task 6 + P3)
# Build context: monitoreo/frontend
#   docker build -t monitoreo-frontend:local ./monitoreo/frontend
# Sirve con nginx en puerto 80 interno (mapeado a 5174 en compose).
# runtime: nginx:alpine (no node en runtime).
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# URL del backend Monitoreo inyectada en build (Vite la congela en el bundle).
ARG VITE_API_URL=http://localhost:4000/api/v1
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
