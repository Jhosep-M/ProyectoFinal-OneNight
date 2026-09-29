-- Monitoreo V1.0 — DDL. Aplicar vía Supabase MCP apply_migration.
-- Reglas: UUID PK, NUMERIC (nunca float) para cantidades/dinero, estados con CHECK,
-- índices en FKs/fechas/estados, sin FKs hacia tablas del POS.
CREATE SCHEMA IF NOT EXISTS monitoreo;
SET search_path TO monitoreo, public;

-- ===== RBAC =====
CREATE TABLE organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nit TEXT UNIQUE,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuario (
  id UUID PRIMARY KEY, -- coincide con auth.uid de Supabase Auth
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo'))
);

CREATE TABLE permiso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE rol_permiso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id UUID NOT NULL REFERENCES rol(id),
  permiso_id UUID NOT NULL REFERENCES permiso(id),
  UNIQUE (rol_id, permiso_id)
);

CREATE TABLE usuario_organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  rol_id UUID NOT NULL REFERENCES rol(id),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, organizacion_id)
);

-- ===== Integración (solo hashes) =====
CREATE TABLE integracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  nombre TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE, -- sha256 hex; jamás texto plano
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  ultimo_uso_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Medición =====
CREATE TABLE tipo_recurso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE CHECK (codigo IN ('agua','energia')),
  nombre TEXT NOT NULL,
  unidad_base TEXT NOT NULL
);

CREATE TABLE punto_medicion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  codigo_medidor TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_punto_medicion_org ON punto_medicion(organizacion_id);

-- ===== Recepción de consumos del POS (idempotencia) =====
CREATE TABLE recepcion_consumo_pos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumo_externo_id UUID NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  punto_medicion_id UUID REFERENCES punto_medicion(id),
  tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('agua','energia')),
  cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  unidad_medida TEXT NOT NULL,
  fecha_consumo TIMESTAMPTZ NOT NULL,
  origen TEXT NOT NULL DEFAULT 'POS',
  estado TEXT NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido','procesado','error')),
  recepcionado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recepcion_org_fecha ON recepcion_consumo_pos(organizacion_id, fecha_consumo);
CREATE INDEX idx_recepcion_estado ON recepcion_consumo_pos(estado);

CREATE TABLE cola_procesamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id UUID NOT NULL UNIQUE REFERENCES recepcion_consumo_pos(id),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','procesado','error')),
  intentos INT NOT NULL DEFAULT 0,
  proximo_intento TIMESTAMPTZ,
  ultimo_error TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cola_claim ON cola_procesamiento(estado, proximo_intento);

-- ===== Registro + clasificación =====
CREATE TABLE registro_consumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id UUID NOT NULL UNIQUE REFERENCES recepcion_consumo_pos(id),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  punto_medicion_id UUID REFERENCES punto_medicion(id),
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('agua','energia')),
  cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  unidad_medida TEXT NOT NULL,
  fecha_consumo TIMESTAMPTZ NOT NULL,
  clasificacion TEXT NOT NULL DEFAULT 'sin_umbral' CHECK (clasificacion IN ('normal','alerta','critico','sin_umbral')),
  origen TEXT NOT NULL DEFAULT 'POS',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_registro_org_fecha ON registro_consumo(organizacion_id, fecha_consumo);

CREATE TABLE umbral_clasificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  nombre TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('normal','alerta','critico')),
  limite_inferior NUMERIC(14,3) NOT NULL CHECK (limite_inferior >= 0),
  limite_superior NUMERIC(14,3) NOT NULL CHECK (limite_superior > 0),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (limite_inferior < limite_superior),
  UNIQUE (organizacion_id, tipo_recurso_id, nombre)
);
CREATE INDEX idx_umbral_lookup ON umbral_clasificacion(organizacion_id, tipo_recurso_id, estado);

-- ===== Alertas / notificaciones / entrega =====
CREATE TABLE alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  registro_consumo_id UUID REFERENCES registro_consumo(id),
  umbral_id UUID REFERENCES umbral_clasificacion(id),
  nivel TEXT NOT NULL CHECK (nivel IN ('alerta','critico')),
  tipo_recurso TEXT NOT NULL CHECK (tipo_recurso IN ('agua','energia')),
  mensaje TEXT NOT NULL,
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','entregada','error')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerta_org_fecha ON alerta(organizacion_id, fecha_generacion);

CREATE TABLE notificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id UUID NOT NULL REFERENCES alerta(id),
  usuario_id UUID REFERENCES usuario(id), -- NULL = broadcast a la org
  canal TEXT NOT NULL DEFAULT 'in_app' CHECK (canal IN ('in_app','email')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','vista','error')),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  vista_en TIMESTAMPTZ
);
CREATE INDEX idx_notif_usuario ON notificacion(usuario_id, estado);

CREATE TABLE entrega_alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id UUID NOT NULL UNIQUE REFERENCES alerta(id),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviada','error')),
  intentos INT NOT NULL DEFAULT 0,
  proximo_intento TIMESTAMPTZ,
  ultimo_error TEXT,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entrega_claim ON entrega_alerta(estado, proximo_intento);

-- ===== Objetivos / costos / recomendaciones =====
CREATE TABLE meta_reduccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  nombre TEXT NOT NULL,
  porcentaje_reduccion NUMERIC(5,2) NOT NULL CHECK (porcentaje_reduccion >= 0 AND porcentaje_reduccion <= 100),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','cumplida','incumplida')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_inicio < fecha_fin)
);
CREATE INDEX idx_meta_org ON meta_reduccion(organizacion_id, estado);

CREATE TABLE tarifa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID REFERENCES organizacion(id), -- NULL = tarifa global
  tipo_recurso_id UUID NOT NULL REFERENCES tipo_recurso(id),
  nombre TEXT NOT NULL,
  monto NUMERIC(14,4) NOT NULL CHECK (monto >= 0),
  unidad TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_inicio <= fecha_fin)
);
CREATE INDEX idx_tarifa_vigencia ON tarifa(tipo_recurso_id, fecha_inicio, fecha_fin);

CREATE TABLE recomendacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES organizacion(id),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta')),
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','aplicada','descartada')),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recomendacion_org ON recomendacion(organizacion_id, estado);

-- ===== Auditoría =====
CREATE TABLE auditoria_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad TEXT NOT NULL,
  entidad_id UUID,
  accion TEXT NOT NULL,
  usuario_id UUID,
  req_id TEXT,
  detalle JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_entidad ON auditoria_cambio(entidad, entidad_id);
CREATE INDEX idx_auditoria_fecha ON auditoria_cambio(creado_en);
