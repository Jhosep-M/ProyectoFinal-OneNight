-- 006 — anti-solape de umbrales a nivel DB (backstop de haySolapeRangos en app).
-- La app (services/umbrales.service.js) devuelve 400 'Rango solapado' amistoso;
-- esta EXCLUDE evita carreras concurrentes que el chequeo previo no ve.
-- Rangos semiabiertos [inf, sup): contiguos (1000 en [0,1000) y [1000,1500))
-- NO solapan porque el superior es exclusivo. Solo filas estado='activo' participan.
-- Requiere btree_gist para igualdad de UUID dentro del índice GiST.
-- Idempotente: no rompe seeds (rangos ejemplo ya son contiguos).
CREATE EXTENSION IF NOT EXISTS btree_gist;
SET search_path TO monitoreo, public;

ALTER TABLE monitoreo.umbral_clasificacion
  DROP CONSTRAINT IF EXISTS no_solape_umbral_activo;

ALTER TABLE monitoreo.umbral_clasificacion
  ADD CONSTRAINT no_solape_umbral_activo
  EXCLUDE USING gist (
    organizacion_id WITH =,
    tipo_recurso_id WITH =,
    numrange(limite_inferior, limite_superior, '[)') WITH &&
  )
  WHERE (estado = 'activo');
