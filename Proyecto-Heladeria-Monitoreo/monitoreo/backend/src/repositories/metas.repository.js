const { MetaReduccion } = require('../models');

async function listarPorOrg(organizacionId) {
  return MetaReduccion.findAll({
    where: { organizacion_id: organizacionId },
    order: [['creado_en', 'DESC']],
  });
}

<<<<<<< HEAD
=======
async function listarActivosPorOrg(organizacionId) {
  return MetaReduccion.findAll({
    where: { organizacion_id: organizacionId, estado: 'activo' },
    order: [['creado_en', 'DESC']],
  });
}

>>>>>>> origin/feature/Airton-auxilio
async function buscarPorId(id) {
  return MetaReduccion.findByPk(id);
}

// El service ya mapea camelCase → snake_case: los atributos del modelo NO
// tienen autonormalización, create/update con claves camelCase las descartaría.
async function crear(datos) {
  return MetaReduccion.create(datos);
}

async function actualizar(id, campos) {
  const m = await MetaReduccion.findByPk(id);
  if (!m) return null;
  await m.update(campos);
  return m;
}

<<<<<<< HEAD
module.exports = { listarPorOrg, buscarPorId, crear, actualizar };
=======
module.exports = { listarPorOrg, listarActivosPorOrg, buscarPorId, crear, actualizar };
>>>>>>> origin/feature/Airton-auxilio
