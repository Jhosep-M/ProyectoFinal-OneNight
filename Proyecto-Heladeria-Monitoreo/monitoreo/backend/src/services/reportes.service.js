const repo = require('../repositories/reportes.repository');

async function reporteConsumo(organizacionId, { desde, hasta }) {
  const [porRecurso, alertasPorNivel, costoEstimado, avanceMetas] = await Promise.all([
    repo.resumenConsumo(organizacionId, desde, hasta),
    repo.resumenAlertas(organizacionId, desde, hasta),
    repo.costoEstimado(organizacionId, desde, hasta),
    repo.avanceMetas(organizacionId),
  ]);
  return { porRecurso, alertasPorNivel, costoEstimado, avanceMetas, rango: { desde: desde ?? null, hasta: hasta ?? null } };
}

async function topExcesos(organizacionId, { desde, hasta, limite }) {
  return repo.topExcesos(organizacionId, desde, hasta, limite);
}

async function auditoriaReporte(organizacionId, { desde, hasta, page, limit }) {
  return repo.auditoria(organizacionId, { desde, hasta, page, limit });
}

module.exports = { reporteConsumo, topExcesos, auditoriaReporte };
