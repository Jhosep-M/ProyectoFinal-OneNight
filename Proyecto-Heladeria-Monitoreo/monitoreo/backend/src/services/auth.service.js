const usuariosRepo = require('../repositories/usuarios.repository');

async function getPerfil(usuarioId, email, nombre = null) {
  await usuariosRepo.upsertUsuario(usuarioId, email, nombre);
  const membresias = await usuariosRepo.membresiasActivas(usuarioId);
  return {
    id: usuarioId,
    email,
    organizaciones: membresias.map((m) => ({
      id: m.organizacion.id,
      nombre: m.organizacion.nombre,
      rol: m.rol.nombre,
      permisos: m.rol.permisos.map((p) => p.nombre),
    })),
  };
}

module.exports = { getPerfil };
