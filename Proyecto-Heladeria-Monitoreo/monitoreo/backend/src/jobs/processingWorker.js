const { QueryTypes, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { env } = require('../config/environment');
const { logger } = require('../utils/logger');
const { clasificar } = require('../services/clasificacion.service');
const registroRepo = require('../repositories/registro.repository');
const { crearAlerta } = require('../services/alertas.service');
const { notificarAlerta } = require('../services/notificaciones.service');
const { registrarAuditoria } = require('../services/auditoria.service');
const { RecepcionConsumoPOS, ColaProcesamiento, RegistroConsumo } = require('../models');

const PROCESO_MAX_INTENTOS = 5;

// Claim estilo colaWorker del POS: fila libre (o con backoff vencido),
// bloqueo corto para que un segundo worker la salte (SKIP LOCKED).
// Prefijo `${env.dbSchema}` = mismo schema que search_path (monitoreo en dev,
// monitoreo_test en tests): equivalente a ir sin prefijo, nunca hardcodeado.
const CLAIM_SQL = `
  SELECT cp.id, cp.recepcion_id
    FROM ${env.dbSchema}.cola_procesamiento cp
   WHERE cp.estado = 'pendiente'
     AND (cp.proximo_intento IS NULL OR cp.proximo_intento <= now())
   ORDER BY cp.creado_en
   LIMIT 1
   FOR UPDATE SKIP LOCKED`;

// IMPORTANTE: claim y procesamiento viven en la MISMA transacción (t): el lock
// del FOR UPDATE se retiene durante todo el procesamiento → un segundo worker
// concurrente salta la fila (SKIP LOCKED) y jamás la procesa dos veces.
async function processColaOnce({ limite = 5 } = {}) {
  let procesadas = 0;
  for (let i = 0; i < limite; i += 1) {
    let filaFallida = null;
    try {
      const hecho = await sequelize.transaction(async (t) => {
        // QueryTypes.SELECT devuelve el arreglo de filas DIRECTAMENTE en
        // sequelize v6 (no [filas, metadata]): destructurar `[filas]`
        // capturar la primera FILA y el worker no procesaría nunca nada.
        const filas = await sequelize.query(CLAIM_SQL, { transaction: t, type: QueryTypes.SELECT });
        const fila = filas[0];
        if (!fila) return false; // no hay cola pendiente con backoff vencido
        filaFallida = fila;
        await procesarFila(fila, t);
        filaFallida = null;
        return true;
      });
      if (!hecho) break;
      procesadas += 1;
    } catch (e) {
      // La transacción hizo rollback (la fila vuelve a 'pendiente'); recién
      // ahora, fuera de la tx abortada, escribimos el error y el backoff.
      if (filaFallida) await marcarErrorFila(filaFallida, e.message);
      else logger.error({ err: e.message }, 'error externo en processColaOnce');
      procesadas += filaFallida ? 1 : 0;
      break; // fallo sistemático: cortar el lote evita un loop de errores
    }
  }
  return procesadas;
}

async function marcarErrorFila(fila, error) {
  // Sin type explícito → RAW → sequelize devuelve [rows, metadata]: por eso
  // `const [previa]` es el arreglo de filas y previa[0] la fila.
  const [previa] = await sequelize.query(
    'SELECT intentos FROM cola_procesamiento WHERE id = :id', { replacements: { id: fila.id } },
  );
  // Backoff = DELIVERY_BACKOFF_MINUTES * intentos (misma fórmula que el POS),
  // calculado en JS para no depender de precedencias SQL.
  const intentos = (previa?.[0]?.intentos ?? 0) + 1;
  const terminal = intentos >= PROCESO_MAX_INTENTOS;
  const proximo = terminal
    ? null
    : new Date(Date.now() + env.deliveryBackoffMinutes * intentos * 60 * 1000);
  await sequelize.query(
    `UPDATE cola_procesamiento
        SET estado = :estado, intentos = :intentos, ultimo_error = :err, proximo_intento = :proximo
      WHERE id = :id`,
    {
      replacements: {
        estado: terminal ? 'error' : 'pendiente',
        intentos,
        err: String(error).slice(0, 500),
        proximo,
        id: fila.id,
      },
    },
  );
  logger.error({ colaId: fila.id, intentos, terminal }, 'fallo procesando fila');
}

// Procesa UNA fila dentro de la transacción t del claim (toda query lleva t).
async function procesarFila(fila, t) {
  const recepcion = await RecepcionConsumoPOS.findByPk(fila.recepcion_id, { transaction: t });
  if (!recepcion) {
    await ColaProcesamiento.update(
      { estado: 'error', intentos: 1, ultimo_error: 'recepcion inexistente', proximo_intento: null },
      { where: { id: fila.id }, transaction: t },
    );
    return 'error';
  }

  const tipoRecurso = await registroRepo.tipoRecursoPorCodigo(recepcion.tipo_recurso, t);
  const umbrales = await registroRepo.umbralesActivos(recepcion.organizacion_id, tipoRecurso.id, t);
  const { nivel, umbralId } = clasificar(recepcion.cantidad, umbrales);

  // Con el lock del claim retenido no puede haber otro registro concurrente:
  // el pre-chequeo evita encimar en reintentos (catch de UNIQUE dentro de una
  // tx de PG abortaría la transacción) y la UNIQUE(recepcion_id) de la BD queda
  // como última red de seguridad a nivel esquema.
  let registro = await RegistroConsumo.findOne({ where: { recepcion_id: recepcion.id }, transaction: t });
  const creado = !registro;

  if (creado) {
    registro = await registroRepo.crearRegistro({
      recepcion_id: recepcion.id,
      organizacion_id: recepcion.organizacion_id,
      punto_medicion_id: recepcion.punto_medicion_id,
      tipo_recurso_id: tipoRecurso.id,
      tipo_recurso: recepcion.tipo_recurso,
      cantidad: recepcion.cantidad,
      unidad_medida: recepcion.unidad_medida,
      fecha_consumo: recepcion.fecha_consumo,
      clasificacion: nivel,
      origen: recepcion.origen,
    }, t);

    await registrarAuditoria({
      entidad: 'registro_consumo', entidadId: registro.id, accion: 'clasificar',
      detalle: { nivel, umbralId, recepcionId: recepcion.id },
    }, t);

    if (nivel === 'alerta' || nivel === 'critico') {
      const umbral = umbrales.find((u) => u.id === umbralId);
      const alerta = await crearAlerta({
        organizacionId: recepcion.organizacion_id,
        registroId: registro.id,
        umbralId,
        nivel,
        tipoRecurso: recepcion.tipo_recurso,
        cantidad: Number(recepcion.cantidad),
        unidad: recepcion.unidad_medida,
        nombreUmbral: umbral?.nombre ?? 'sin nombre',
      }, t);
      await notificarAlerta(alerta, t);
    }
  }

  await recepcion.update({ estado: 'procesado' }, { transaction: t });
  await ColaProcesamiento.update(
    { estado: 'procesado', intentos: literal('intentos + 1'), ultimo_error: null, proximo_intento: null },
    { where: { id: fila.id }, transaction: t },
  );
  return 'procesado';
}

let timer = null;
let corriendo = false;

async function loop() {
  if (corriendo) return; // nunca solapar
  corriendo = true;
  try {
    await processColaOnce({ limite: 5 });
  } catch (e) {
    logger.error({ err: e.message }, 'loop de procesamiento falló');
  } finally {
    corriendo = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(loop, env.workerIntervalMs);
  logger.info({ intervalMs: env.workerIntervalMs }, 'processingWorker iniciado');
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { processColaOnce, start, stop };

// Ejecución directa: node src/jobs/processingWorker.js (una pasada manual)
if (require.main === module) {
  processColaOnce({ limite: 20 }).then((n) => {
    logger.info({ n }, 'pasada manual completada');
    process.exit(0);
  }).catch((e) => {
    logger.error({ err: e.message }, 'pasada manual falló');
    process.exit(1);
  });
}
