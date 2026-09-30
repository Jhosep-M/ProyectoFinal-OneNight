const { sequelize } = require('../config/database');
const { env } = require('../config/environment');
const { logger } = require('../utils/logger');
const { EntregaAlerta, Alerta } = require('../models');
const { enviarAlertaPOS } = require('../integrations/pos.client');
const { registrarAuditoria } = require('../services/auditoria.service');
const { QueryTypes } = require('sequelize');

// Claim con lease: al reclamar incrementa intentos y posterga
// proximo_intento 1 minuto — si el worker muere hablando con el POS,
// la fila vuelve a estar disponible sola (at-least-once; el POS
// deduplica por alertaId, contrato §7).
const CLAIM_SQL = `
  UPDATE ${env.dbSchema}.entrega_alerta
     SET intentos = intentos + 1,
         proximo_intento = now() + interval '1 minute'
   WHERE id = (
     SELECT id FROM ${env.dbSchema}.entrega_alerta
      WHERE estado = 'pendiente'
        AND (proximo_intento IS NULL OR proximo_intento <= now())
      ORDER BY creada_en
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
   RETURNING id, alerta_id, intentos`;

// Envia una alerta al POS y actualiza estados (reuso por el worker y por
// la entrega inmediata que dispara el servicio al crear/reenviar).
async function procesarEntrega(alerta, entregaId, intentos, extra = {}) {
  try {
    const { ok, status } = await enviarAlertaPOS(alerta);
    if (!ok) throw new Error(`POS respondió ${status}`);

    await EntregaAlerta.update(
      { estado: 'enviada', proximo_intento: null, ultimo_error: null },
      { where: { id: entregaId } },
    );
    await Alerta.update({ estado: 'entregada' }, { where: { id: alerta.id } });
    await registrarAuditoria({
      entidad: 'entrega_alerta', entidadId: entregaId, accion: 'entregar',
      detalle: { alertaId: alerta.id, status, intentos, ...extra },
    });
    return 'enviada';
  } catch (e) {
    const terminal = intentos >= env.deliveryMaxIntentos;
    const proximo = terminal
      ? null
      : new Date(Date.now() + env.deliveryBackoffMinutes * intentos * 60 * 1000);
    await EntregaAlerta.update(
      { estado: terminal ? 'error' : 'pendiente', ultimo_error: String(e.message).slice(0, 500), proximo_intento: proximo },
      { where: { id: entregaId } },
    );
    if (terminal) await Alerta.update({ estado: 'error' }, { where: { id: alerta.id } });
    await registrarAuditoria({
      entidad: 'entrega_alerta', entidadId: entregaId, accion: 'reintentar',
      detalle: { alertaId: alerta.id, intentos, terminal, ...extra, error: String(e.message).slice(0, 200) },
    });
    logger.warn({ entregaId, intentos, terminal }, 'entrega de alerta fallida');
    return terminal ? 'error_terminal' : 'reintento';
  }
}

async function entregarUnaVez() {
  const [reclamadas] = await sequelize.query(CLAIM_SQL, { type: QueryTypes.SELECT, returning: true });
  const fila = Array.isArray(reclamadas) ? reclamadas[0] : reclamadas;
  if (!fila?.id) return 'vacia';

  const alerta = await Alerta.findByPk(fila.alerta_id);
  if (!alerta) {
    await EntregaAlerta.update(
      { estado: 'error', ultimo_error: 'alerta inexistente', proximo_intento: null },
      { where: { id: fila.id } },
    );
    return 'error_terminal';
  }

  return procesarEntrega(alerta, fila.id, fila.intentos);
}

// Entrega inmediata de UNA alerta concreta (la dispara el servicio al
// crear/reenviar manualmente). No reemplaza a la cola: si falla, la fila
// queda 'pendiente' y el worker la reintenta con backoff.
async function entregarAlertaPorId(alertaId) {
  const entrega = await EntregaAlerta.findOne({ where: { alerta_id: alertaId } });
  if (!entrega) return 'sin_entrega';
  const alerta = await Alerta.findByPk(alertaId);
  if (!alerta) return 'error_terminal';

  const intentos = entrega.intentos + 1;
  await entrega.update({ intentos, proximo_intento: new Date(Date.now() + 60000) });
  return procesarEntrega(alerta, entrega.id, intentos, { inmediata: true });
}

let timer = null;
let corriendo = false;

async function loop() {
  if (corriendo) return;
  corriendo = true;
  try {
    // Drena hasta que no queden filas listas (o un máximo de 20 por tick).
    for (let i = 0; i < 20; i += 1) {
      const r = await entregarUnaVez();
      if (r === 'vacia') break;
    }
  } catch (e) {
    logger.error({ err: e.message }, 'loop de entrega de alertas falló');
  } finally {
    corriendo = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(loop, env.workerIntervalMs);
  logger.info({ intervalMs: env.workerIntervalMs }, 'alertDeliveryWorker iniciado');
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { entregarUnaVez, entregarAlertaPorId, start, stop };
