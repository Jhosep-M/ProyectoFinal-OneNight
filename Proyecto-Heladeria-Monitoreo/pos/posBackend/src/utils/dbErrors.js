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

// RAISE EXCEPTION de funciones PG (SQLSTATE P0001): errores de negocio
// levantados a proposito (stock insuficiente, pagos que no cuadran, turno
// cerrado). Las rutas los traducen a 400 humano; el fallback devuelve el
// mensaje PG (escrito en espanol por el equipo, legible para el usuario).
function isPgRaiseException(e) {
  if (!e) return false;
  const codes = [e.code, e.original?.code, e.parent?.code];
  return codes.includes('P0001');
}

const PG_BUSINESS_MESSAGES = [
  [/stock_insuficiente/i, 'Stock insuficiente para completar la operación'],
  [/stock_negativo/i, 'Stock insuficiente para completar la operación'],
  [/no coinciden con total/i, 'Los pagos no coinciden con el total de la venta'],
  [/turno no abierto/i, 'No hay un turno abierto para registrar la venta'],
  [/turno y usuario obligatorios/i, 'Turno y usuario son obligatorios'],
  [/puntos insuficientes/i, 'El cliente no tiene puntos suficientes'],
  [/canje requiere cliente/i, 'El canje de puntos requiere un cliente'],
  [/producto .* no existe/i, 'Uno de los productos no existe'],
  [/cliente no existe/i, 'Cliente no encontrado'],
  [/descuento mayor al subtotal/i, 'El descuento no puede ser mayor al subtotal'],
  [/descuento inválido/i, 'Descuento no válido'],
  [/pago inválido/i, 'Uno de los pagos no es válido'],
  [/items vacíos/i, 'La venta debe incluir al menos un producto'],
  [/pagos vacíos/i, 'La venta debe incluir al menos un pago'],
  [/cantidad inválida/i, 'Cantidad no válida'],
  [/precio inválido/i, 'Precio del producto no válido'],
];

// Devuelve un mensaje humano para errores de negocio de PG:
// - RAISE EXCEPTION de funciones (SQLSTATE P0001, ej. 'pagos no coinciden');
// - CHECK de stock (23514 producto_stock_ck / insumo): en la práctica se
//   dispara ANTES que el RAISE 'STOCK_INSUFICIENTE' de registrar_venta.
// Retorna null para dejar pasar el error al siguiente manejador.
function businessErrorMessage(e) {
  const msg = String((e && e.message) || '');
  const codes = [e.code, e.original?.code, e.parent?.code];
  const constraint = [e.constraint, e.original?.constraint, e.parent?.constraint].find(Boolean) || '';
  const detail = [e.detail, e.original?.detail, e.parent?.detail].find(Boolean) || '';
  const text = `${constraint} ${detail} ${msg}`;
  if (codes.includes('23514') && /stock/i.test(text)) {
    return 'Stock insuficiente para completar la operación';
  }
  if (!isPgRaiseException(e)) return null;
  for (const [re, friendly] of PG_BUSINESS_MESSAGES) {
    if (re.test(msg)) return friendly;
  }
  return msg;
}

module.exports = { isUniqueViolation, uniqueViolationTarget, pgConstraintCode, constraintErrorMessage, isPgRaiseException, businessErrorMessage };
