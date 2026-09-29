const crypto = require('crypto');
const repo = require('../repositories/integraciones.repository');
const { AppError } = require('../utils/errors');
const { registrarAuditoria } = require('./auditoria.service');

function sha256hex(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

// La key plaintext NUNCA se persiste: solo sale en esta respuesta.
async function crearIntegracion(datos, contexto) {
  const apiKey = `mon_${crypto.randomBytes(24).toString('hex')}`;
  const integracion = await repo.crear({ ...datos, api_key_hash: sha256hex(apiKey) });
  await registrarAuditoria({
    entidad: 'integracion', entidadId: integracion.id, accion: 'crear',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId,
    detalle: { nombre: datos.nombre, organizacionId: datos.organizacionId },
  });
  return { integracion: await repo.buscarPorId(integracion.id), apiKey };
}

async function rotarClave(id, contexto) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw new AppError(404, 'Integración no encontrada');
  const apiKey = `mon_${crypto.randomBytes(24).toString('hex')}`;
  await repo.guardarHash(id, sha256hex(apiKey));
  await registrarAuditoria({
    entidad: 'integracion', entidadId: id, accion: 'rotar_clave',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: null, // jamás loguear la key
  });
  return { integracion: await repo.buscarPorId(id), apiKey };
}

async function cambiarEstado(id, estado, contexto) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw new AppError(404, 'Integración no encontrada');
  await repo.actualizar(id, { estado });
  await registrarAuditoria({
    entidad: 'integracion', entidadId: id, accion: 'actualizar',
    usuarioId: contexto.usuarioId, reqId: contexto.reqId, detalle: { estado },
  });
  return repo.buscarPorId(id);
}

module.exports = { crearIntegracion, rotarClave, cambiarEstado };
