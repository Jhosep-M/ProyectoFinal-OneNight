# Proyecto Heladería + Monitoreo

Sistema compuesto por dos aplicaciones independientes pero integradas:

1. **POS — Heladería/Cafetería**: ventas, caja, pedidos, mesas, inventario, clientes, promociones e integración con Monitoreo.
2. **Monitoreo de Agua y Energía**: organizaciones, puntos de medición, consumo, umbrales, alertas, metas y reportes.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| ORM | Sequelize |
| Base de datos | PostgreSQL (Supabase) |
| Auth | Supabase Auth + JWT |
| Autorización | RBAC + RLS |
| Contenedores | Docker |
| Orquestación | Kubernetes |
| Cloud | AWS |

## Estructura

```
Proyecto-Heladeria-Monitoreo/
├── pos/
│   ├── frontend/          # React + Vite
│   └── posBackend/        # Node.js + Express + Sequelize
├── monitoreo/
│   ├── frontend/          # React + Vite
│   └── backend/           # Node.js + Express + Sequelize
├── database/
│   ├── pos/               # Migraciones POS
│   └── monitoreo/         # Migraciones Monitoreo
├── shared/
│   ├── contracts/         # Contratos de integración
│   └── docs/              # Documentación compartida
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── aws/
├── docs/
│   ├── requirements/
│   ├── uml/
│   ├── user-manual/
│   ├── technical-manual/
│   └── testing/
└── docker-compose.yml
```

## Quick Start

### POS Frontend

```bash
cd pos/frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción
npm run test       # tests (Vitest)
```

### POS Backend

```bash
cd pos/posBackend
npm install
npm run dev        # http://localhost:3000
npm run test       # tests (Jest)
```

### Docker

```bash
docker-compose up --build
```

## Documentación

- [Arquitectura](shared/docs/architecture.md)
- [Autenticación](shared/docs/authentication.md)
- [Autorización](shared/docs/authorization.md)
- [Contratos API](shared/docs/api-contract.md)
- [Integración](shared/docs/integration.md)
- [Requisitos](docs/requirements/requisitos-pos.md)
- [Manual de usuario](docs/user-manual/manual-usuario.md)
- [Manual técnico](docs/technical-manual/manual-tecnico.md)
- [Prueba integrada](docs/testing/prueba-integrada-17-pasos.md)
