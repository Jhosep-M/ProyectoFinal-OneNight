# =============================================================================
# POS backend — Dockerfile (Persona 4 / Task 6)
# Build context: pos/posBackend
#   docker build -t pos-backend:local ./pos/posBackend
# Health: GET /health -> { ok: true } (src/routes/health.js, confirmado)
# =============================================================================
FROM node:24-alpine AS base
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Dependencias de sistema para healthcheck (wget viene en busybox, se declara
# explícito por claridad) y para módulos nativos si hicieran falta.
RUN apk add --no-cache wget

# Instalar solo dependencias de producción para una imagen mínima.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY src ./src

EXPOSE 3000

# El healthcheck usa el endpoint real expuesto por el backend.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health | grep -q '"ok":true' || exit 1

USER node
CMD ["node", "src/server.js"]
