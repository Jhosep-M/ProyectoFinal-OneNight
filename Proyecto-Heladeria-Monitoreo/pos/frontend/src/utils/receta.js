export function validarCantidad(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 'Cantidad debe ser > 0';
  if (n > 999999) return 'Cantidad excesiva';
  return null;
}

export function calcularPorciones(lineas = []) {
  if (!lineas.length) return 0;
  let min = Infinity;
  for (const l of lineas) {
    const stock = Number(l.stock ?? 0);
    const req = Number(l.cantidad_requerida ?? 0);
    if (!req || req <= 0) return 0;
    min = Math.min(min, Math.floor(stock / req));
  }
  return min === Infinity ? 0 : Math.max(0, min);
}

export function calcularCosto(lineas = []) {
  return lineas.reduce(
    (acc, l) => acc + Number(l.cantidad_requerida || 0) * Number(l.costo_unitario || 0),
    0,
  );
}
