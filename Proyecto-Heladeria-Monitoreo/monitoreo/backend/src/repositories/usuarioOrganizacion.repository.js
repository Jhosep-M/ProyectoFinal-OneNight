const { UsuarioOrganizacion, Rol, Organizacion, Usuario } = require('../models');
const { Op } = require('sequelize');

async function listarMiembros(organizacionId) {
  return UsuarioOrganizacion.findAll({
    where: { organizacion_id: organizacionId },
    include: [
      { model: Rol, as: 'rol' },
      { model: Usuario, as: 'usuario' },
      { model: Organizacion, as: 'organizacion' },
    ],
    order: [['creado_en', 'DESC']],
  });
}

async function buscarPorId(id) {
  return UsuarioOrganizacion.findByPk(id);
}

async function asignar({ usuarioId, email, organizacionId, rolId }) {
  // upsert del usuario ANTES de la membresía: usuario_organizacion.usuario_id
  // es FK a usuario(id) — insertar la membresía primero viola la FK para usuarios nuevos.
  const { upsertUsuario } = require('./usuarios.repository');
  await upsertUsuario(usuarioId, email);
  const [fila] = await UsuarioOrganizacion.findOrCreate({
    where: { usuario_id: usuarioId, organizacion_id: organizacionId },
    defaults: { rol_id: rolId, estado: 'activo' },
  });
  if (fila.rol_id !== rolId && fila.estado === 'activo') await fila.update({ rol_id: rolId });
  return fila;
}

async function actualizar(id, campos) {
  const fila = await UsuarioOrganizacion.findByPk(id);
  if (!fila) return null;
  // Mapeo camelCase (validator) → snake_case: `fila.update({ rolId })` sería
  // ignorado silenciosamente por Sequelize (atributo `rol_id`).
  const cambios = {};
  if (campos.rolId !== undefined) cambios.rol_id = campos.rolId;
  if (campos.estado !== undefined) cambios.estado = campos.estado;
  await fila.update(cambios);
  return fila;
}

module.exports = { listarMiembros, buscarPorId, asignar, actualizar };
