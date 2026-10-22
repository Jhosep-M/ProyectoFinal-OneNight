function isUniqueViolation(e) {
  if (!e) return false;
  if (e.name === 'SequelizeUniqueConstraintError') return true;
  const codes = [e.code, e.original?.code, e.parent?.code];
  if (codes.includes('23505')) return true;
  return /duplicate|unique/i.test(e.message || '');
}

function uniqueViolationTarget(e) {
  if (!isUniqueViolation(e)) return null;
  const constraint = [e.constraint, e.original?.constraint, e.parent?.constraint].find(Boolean) || '';
  const text = `${constraint} ${e.detail || ''} ${e.message || ''}`;
  if (/correo/i.test(text)) return 'correo';
  if (/nit/i.test(text)) return 'nit';
  return 'otro';
}

// Codigos de violacion de constraint de PostgreSQL que se traducen a 400.
const PG_CONSTRAINT_MESSAGES = {
  23502: 'Faltan campos obligatorios en la solicitud',
  23503: 'Referencia invalida (mesa o producto inexistente)',
  23514: 'Valor no permitido por las reglas del sistema',
};

function pgConstraintCode(e) {
  if (!e) return null;
  const codes = [e.code, e.original?.code, e.parent?.code];
  return codes.find((c) => Object.prototype.hasOwnProperty.call(PG_CONSTRAINT_MESSAGES, c)) || null;
}

// Devuelve un mensaje legible si el error es una violacion de constraint PG,
// o null si no lo es (para dejar pasar otros errores al errorHandler).
function constraintErrorMessage(e) {
  const code = pgConstraintCode(e);
  return code ? PG_CONSTRAINT_MESSAGES[code] : null;
}

module.exports = { isUniqueViolation, uniqueViolationTarget, pgConstraintCode, constraintErrorMessage };
