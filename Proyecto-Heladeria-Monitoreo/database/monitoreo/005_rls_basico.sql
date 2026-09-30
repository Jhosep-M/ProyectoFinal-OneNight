-- 005 — RLS básico tenant (Fase 1 Seguridad).
-- Alinea con DDL 001_v1_0_monitoreo_ddl.sql: usa SOLO columnas reales
-- (organizacion.id, <tabla>.organizacion_id, usuario_organizacion.usuario_id,
-- usuario_organizacion.organizacion_id, usuario_organizacion.estado).
-- No existe función helper (p. ej. es_miembro_org) en database/monitoreo/functions/,
-- por eso:
--   a) tablas CON organizacion_id directo -> policy básica con auth.uid()
--      vía EXISTS sobre usuario_organizacion (sin recursión: la policy de
--      usuario_organizacion solo compara usuario_id = auth.uid());
--   b) tablas SIN organizacion_id directo (cola_procesamiento, notificacion,
--      entrega_alerta) e integracion (secretos api_key_hash) -> RLS activado +
--      policy DENY-ALL (USING false) para que por defecto nadie lea/escriba;
--      el rol service_role / owner bypasea RLS y el backend opera con él.
--      El ejemplo permisivo futuro queda COMENTADO con TODO: no inventar
--      columnas, crear antes un helper SECURITY DEFINER que resuelva la org
--      padre (recepcion_consumo_pos / alerta) sin recursión RLS.
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE.
-- NOTA: ENABLE (no FORCE) para no romper el acceso service_role del backend.
SET search_path TO monitoreo, public;

-- ===== Activar RLS en todas las tablas tenant =====
ALTER TABLE monitoreo.organizacion         ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.usuario_organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.integracion          ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.punto_medicion       ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.recepcion_consumo_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.cola_procesamiento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.registro_consumo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.umbral_clasificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.alerta               ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.notificacion         ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.entrega_alerta       ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.meta_reduccion       ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.tarifa               ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoreo.recomendacion        ENABLE ROW LEVEL SECURITY;

-- ===== usuario_organizacion: cada usuario solo ve sus propias membresías =====
DROP POLICY IF EXISTS uo_propio ON monitoreo.usuario_organizacion;
CREATE POLICY uo_propio ON monitoreo.usuario_organizacion
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ===== organizacion: solo las orgs donde el usuario es miembro activo =====
DROP POLICY IF EXISTS org_miembros ON monitoreo.organizacion;
CREATE POLICY org_miembros ON monitoreo.organizacion
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM monitoreo.usuario_organizacion uo
    WHERE uo.organizacion_id = organizacion.id
      AND uo.usuario_id = auth.uid()
      AND uo.estado = 'activo'
  ));

-- ===== Tablas con organizacion_id directo: scope por membresía activa =====
DROP POLICY IF EXISTS pm_tenant ON monitoreo.punto_medicion;
CREATE POLICY pm_tenant ON monitoreo.punto_medicion
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM monitoreo.usuario_organizacion uo
    WHERE uo.organizacion_id = punto_medicion.organizacion_id
      AND uo.usuario_id = auth.uid()
      AND uo.estado = 'activo'
  ));

DROP POLICY IF EXISTS recep_tenant ON monitoreo.recepcion_consumo_pos;
CREATE POLICY recep_tenant ON monitoreo.recepcion_consumo_pos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM monitoreo.usuario_organizacion uo
    WHERE uo.organizacion_id = recepcion_consumo_pos.organizacion_id
      AND uo.usuario_id = auth.uid()
      AND uo.estado = 'activo'
  ));

DROP POLICY IF EXISTS reg_tenant ON monitoreo.registro_consumo;
CREATE POLICY reg_tenant ON monitoreo.registro_consumo
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM monitoreo.usuario_organizacion uo
    WHERE uo.organizacion_id = registro_consumo.organizacion_id
      AND uo.usuario_id = auth.uid()
      AND uo.estado = 'activo'
  ));

DROP POLICY IF EXISTS umb_tenant ON monitoreo.umbral_clasificacion;
CREATE POLICY umb_tenant ON monitoreo.umbral_clasificacion
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM monitoreo.usuario_organizacion uo
    WHERE uo.organizacion_id = umbral_clasificacion.organizacion_id
      AND uo.usuario_id = auth.uid()
      AND uo.estado = 'activo'
  ));

DROP POLICY IF EXISTS alerta_tenant ON monitoreo.alerta;
CREATE POLICY alerta_tenant ON monitoreo.alerta
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM monitoreo.usuario_organizacion uo
    WHERE uo.organizacion_id = alerta.organizacion_id
      AND uo.usuario_id = auth.uid()
      AND uo.estado = 'activo'
  ));

DROP POLICY IF EXISTS meta_tenant ON monitoreo.meta_reduccion;
CREATE POLICY meta_tenant ON monitoreo.meta_reduccion
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM monitoreo.usuario_organizacion uo
    WHERE uo.organizacion_id = meta_reduccion.organizacion_id
      AND uo.usuario_id = auth.uid()
      AND uo.estado = 'activo'
  ));

DROP POLICY IF EXISTS reco_tenant ON monitoreo.recomendacion;
CREATE POLICY reco_tenant ON monitoreo.recomendacion
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM monitoreo.usuario_organizacion uo
    WHERE uo.organizacion_id = recomendacion.organizacion_id
      AND uo.usuario_id = auth.uid()
      AND uo.estado = 'activo'
  ));

-- tarifa.organizacion_id es NULLABLE (NULL = tarifa global, DDL 001 líneas 196-207):
-- las globales son legibles por cualquier autenticado; las de org, por miembros.
DROP POLICY IF EXISTS tarifa_tenant ON monitoreo.tarifa;
CREATE POLICY tarifa_tenant ON monitoreo.tarifa
  FOR ALL TO authenticated
  USING (
    tarifa.organizacion_id IS NULL
    OR EXISTS (
      SELECT 1 FROM monitoreo.usuario_organizacion uo
      WHERE uo.organizacion_id = tarifa.organizacion_id
        AND uo.usuario_id = auth.uid()
        AND uo.estado = 'activo'
    )
  );

-- ===== Tablas restringidas: DENY-ALL para roles con RLS (service_role bypasea) =====
-- integracion guarda api_key_hash: jamás exponer a usuarios; solo backend/service_role.
DROP POLICY IF EXISTS integracion_deny ON monitoreo.integracion;
CREATE POLICY integracion_deny ON monitoreo.integracion
  FOR ALL TO authenticated USING (false);
-- TODO(Fase 1): si se necesita lectura de metadatos por usuarios con permiso
-- integracion.consultar, crear helper SECURITY DEFINER (p. ej.
-- monitoreo.es_miembro_org(UUID)) y policy SELECT que oculte api_key_hash
-- (vía vista sin esa columna). No inventar columnas.

-- cola_procesamiento NO tiene organizacion_id (DDL 001: solo recepcion_id).
DROP POLICY IF EXISTS cola_deny ON monitoreo.cola_procesamiento;
CREATE POLICY cola_deny ON monitoreo.cola_procesamiento
  FOR ALL TO authenticated USING (false);
-- TODO(Fase 1): crear helper SECURITY DEFINER que resuelva la org vía
-- recepcion_consumo_pos.organizacion_id (JOIN por recepcion_id) y policy
-- permisiva con EXISTS. No agregar columna organizacion_id sin migración
-- y sin revisar el worker de procesamiento.

-- notificacion NO tiene organizacion_id (DDL 001: alerta_id + usuario_id NULL=broadcast).
DROP POLICY IF EXISTS notif_deny ON monitoreo.notificacion;
CREATE POLICY notif_deny ON monitoreo.notificacion
  FOR ALL TO authenticated USING (false);
-- TODO(Fase 1): crear helper SECURITY DEFINER que resuelva la org vía
-- alerta.organizacion_id (JOIN por alerta_id) + regla broadcast
-- (usuario_id IS NULL => visible a miembros de la org) y policy SELECT /
-- UPDATE(vista) para el dueño. No inventar columnas.

-- entrega_alerta NO tiene organizacion_id (DDL 001: solo alerta_id).
DROP POLICY IF EXISTS entrega_deny ON monitoreo.entrega_alerta;
CREATE POLICY entrega_deny ON monitoreo.entrega_alerta
  FOR ALL TO authenticated USING (false);
-- TODO(Fase 1): crear helper SECURITY DEFINER que resuelva la org vía
-- alerta.organizacion_id (JOIN por alerta_id) y policy permisiva con EXISTS.
-- No agregar columna organizacion_id sin migración y sin revisar el worker
-- de entrega Monitoreo -> POS.
