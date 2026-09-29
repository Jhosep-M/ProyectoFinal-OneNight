const { Usuario, UsuarioOrganizacion, Rol, Permiso } = require('../models');

async function upsertUsuario(id, email, nombre = null) {
  const [fila] = await Usuario.findOrCreate({ where: { id }, defaults: { email, nombre, estado: 'activo' } });
  if (fila.email !== email || (nombre && fila.nombre !== nombre)) {
    await fila.update({ email, nombre: nombre ?? fila.nombre });
  }
  return fila;
}

async function membresiasActivas(usuarioId) {
  return UsuarioOrganizacion.findAll({
    where: { usuario_id: usuarioId, estado: 'activo' },
    include: [
      { model: Rol, as: 'rol', where: { estado: 'activo' }, include: [{ model: Permiso, as: 'permisos' }] },
      { model: require('../models').Organizacion, as: 'organizacion', where: { estado: 'activo' } },
    ],
  });
}

async function listarUsuariosDeOrg(organizacionId) {
  const { UsuarioOrganizacion, Usuario, Rol } = require('../models');
  return UsuarioOrganizacion.findAll({
    where: { organizacion_id: organizacionId },
    include: [{ model: Usuario, as: 'usuario' }, { model: Rol, as: 'rol' }],
  });
}

module.exports = { upsertUsuario, membresiasActivas, listarUsuariosDeOrg };
