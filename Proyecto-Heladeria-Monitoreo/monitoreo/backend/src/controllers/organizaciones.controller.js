const repo = require('../repositories/organizaciones.repository');
const { ok, okList, fail } = require('../utils/response');
const { registrarAuditoria } = require('../services/auditoria.service');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const { membresiasActivas } = require('../repositories/usuarios.repository');
const { asignar } = require('../repositories/usuarioOrganizacion.repository');

// Regla del brief: IDs de :id validados como UUID → 404 sin filtrar existencia.
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listar(req, res) {
  try {
    const data = await repo.listarPorIds(req.orgIds);
    return okList(res, data);
  } catch (e) {
    return fail(res, 500, 'Error listando organizaciones', e.message);
  }
}

async function obtener(req, res) {
  try {
    const org = ES_UUID.test(req.params.id) ? await repo.buscarPorId(req.params.id) : null;
    if (!org || !req.orgIds.includes(org.id)) return fail(res, 404, 'No encontrada');
    return ok(res, org);
  } catch (e) {
    return fail(res, 500, 'Error obteniendo organización', e.message);
  }
}

async function crear(req, res) {
  try {
    const org = await repo.crear(req.body);
    // Auto-membresía del creador (decisión de diseño T5): visibilidad = membresía.
    // Bloque BEST-EFFORT con try/catch propio: si falla, la org se crea igual y
    // jamás devolvemos 500 (ni un 409 falso) con la org ya persistida — se loguea.
    try {
      const [activa] = await membresiasActivas(req.user.id);
      if (activa?.rol_id) {
        const membresia = await asignar({ usuarioId: req.user.id, email: req.user.email, organizacionId: org.id, rolId: activa.rol_id });
        await registrarAuditoria({ entidad: 'usuario_organizacion', entidadId: membresia.id, accion: 'crear', usuarioId: req.user.id, reqId: req.id, detalle: { organizacionId: org.id, origen: 'auto-membresía creador' } });
      }
    } catch (e) {
      logger.warn({ err: e.message, organizacionId: org.id, usuarioId: req.user.id }, 'auto-membresía del creador falló (org creada igual)');
    }
    await registrarAuditoria({ entidad: 'organizacion', entidadId: org.id, accion: 'crear', usuarioId: req.user.id, reqId: req.id, detalle: { nombre: org.nombre } });
    return ok(res, org, 201);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'NIT duplicado');
    return fail(res, 500, 'Error creando organización', e.message);
  }
}

async function actualizar(req, res) {
  try {
    const org = ES_UUID.test(req.params.id) ? await repo.buscarPorId(req.params.id) : null;
    if (!org || !req.orgIds.includes(org.id)) return fail(res, 404, 'No encontrada');
    await repo.actualizar(org.id, req.body);
    await registrarAuditoria({ entidad: 'organizacion', entidadId: org.id, accion: 'actualizar', usuarioId: req.user.id, reqId: req.id, detalle: req.body });
    return ok(res, org);
  } catch (e) {
    return fail(res, 500, 'Error actualizando organización', e.message);
  }
}

module.exports = { listar, obtener, crear, actualizar };
