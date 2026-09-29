const { sequelize } = require('../config/database');

async function resumenConsumo(organizacionId, desde, hasta) {
  const [porRecurso] = await sequelize.query(
    `SELECT rc.tipo_recurso AS tipo,
            COALESCE(SUM(rc.cantidad), 0)::numeric(14,3) AS total,
            COUNT(*)::int AS registros
       FROM registro_consumo rc
      WHERE rc.organizacion_id = :org
        AND (:desde::date IS NULL OR rc.fecha_consumo::date >= :desde::date)
        AND (:hasta::date IS NULL OR rc.fecha_consumo::date <= :hasta::date)
      GROUP BY rc.tipo_recurso
      ORDER BY rc.tipo_recurso`,
    { replacements: { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null } },
  );
  return porRecurso;
}

async function resumenAlertas(organizacionId, desde, hasta) {
  const [filas] = await sequelize.query(
    `SELECT a.nivel, COUNT(*)::int AS total
       FROM alerta a
      WHERE a.organizacion_id = :org
        AND (:desde::date IS NULL OR a.fecha_generacion::date >= :desde::date)
        AND (:hasta::date IS NULL OR a.fecha_generacion::date <= :hasta::date)
      GROUP BY a.nivel
      ORDER BY a.nivel`,
    { replacements: { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null } },
  );
  return filas;
}

async function costoEstimado(organizacionId, desde, hasta) {
  // JOIN LATERAL: prefiere tarifa de la organización sobre la global y
  // desempata por monto DESC → una sola tarifa por registro (sin duplicar).
  const [filas] = await sequelize.query(
    `SELECT rc.tipo_recurso AS tipo,
            COALESCE(SUM(rc.cantidad * tf.monto), 0)::numeric(14,2) AS costo,
            COUNT(tf.id)::int AS registros_con_tarifa
       FROM registro_consumo rc
       LEFT JOIN LATERAL (
         SELECT t.monto, t.id
           FROM tarifa t
          WHERE t.tipo_recurso_id = rc.tipo_recurso_id
            AND (t.organizacion_id IS NULL OR t.organizacion_id = rc.organizacion_id)
            AND rc.fecha_consumo::date BETWEEN t.fecha_inicio AND t.fecha_fin
          ORDER BY (t.organizacion_id IS NOT NULL) DESC, t.monto DESC
          LIMIT 1
       ) tf ON true
      WHERE rc.organizacion_id = :org
        AND (:desde::date IS NULL OR rc.fecha_consumo::date >= :desde::date)
        AND (:hasta::date IS NULL OR rc.fecha_consumo::date <= :hasta::date)
      GROUP BY rc.tipo_recurso
      ORDER BY rc.tipo_recurso`,
    { replacements: { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null } },
  );
  return filas;
}

async function avanceMetas(organizacionId) {
  const [filas] = await sequelize.query(
    `SELECT m.id, m.nombre, m.porcentaje_reduccion::numeric(5,2) AS porcentaje_reduccion,
            m.fecha_inicio, m.fecha_fin, m.estado,
            COALESCE((
              SELECT SUM(rc.cantidad)
                FROM registro_consumo rc
               WHERE rc.organizacion_id = m.organizacion_id
                 AND rc.tipo_recurso_id = m.tipo_recurso_id
                 AND rc.fecha_consumo::date >= m.fecha_inicio
                 AND rc.fecha_consumo::date < LEAST(CURRENT_DATE, m.fecha_fin)
            ), 0)::numeric(14,3) AS consumo_en_meta
       FROM meta_reduccion m
      WHERE m.organizacion_id = :org AND m.estado = 'activo'
      ORDER BY m.fecha_fin`,
    { replacements: { org: organizacionId } },
  );
  return filas;
}

async function topExcesos(organizacionId, desde, hasta, limite) {
  const [filas] = await sequelize.query(
    `SELECT rc.fecha_consumo::date AS dia, rc.tipo_recurso AS tipo,
            SUM(rc.cantidad)::numeric(14,3) AS total
       FROM registro_consumo rc
      WHERE rc.organizacion_id = :org
        AND (:desde::date IS NULL OR rc.fecha_consumo::date >= :desde::date)
        AND (:hasta::date IS NULL OR rc.fecha_consumo::date <= :hasta::date)
      GROUP BY 1, 2
      ORDER BY total DESC
      LIMIT :limite`,
    { replacements: { org: organizacionId, desde: desde ?? null, hasta: hasta ?? null, limite } },
  );
  return filas;
}

module.exports = { resumenConsumo, resumenAlertas, costoEstimado, avanceMetas, topExcesos };
