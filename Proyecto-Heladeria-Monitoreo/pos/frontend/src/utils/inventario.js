export function isStockBajo(insumo = {}) {
  const stock = Number(insumo.stock ?? 0);
  const minimo = Number(insumo.stock_minimo ?? 0);
  if (!Number.isFinite(stock) || !Number.isFinite(minimo)) return false;
  return stock <= minimo;
}

export function isVencido(insumo = {}) {
  if (!insumo.fecha_vencimiento) return false;
  const fv = new Date(insumo.fecha_vencimiento);
  if (Number.isNaN(fv.getTime())) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fv < hoy;
}

export function isPorVencer(insumo = {}, dias = 7) {
  if (!insumo.fecha_vencimiento) return false;
  const fv = new Date(insumo.fecha_vencimiento);
  if (Number.isNaN(fv.getTime())) return false;
  if (isVencido(insumo)) return false;
  const diff = fv.getTime() - Date.now();
  return diff >= 0 && diff <= dias * 86400000;
}

export function getAlertaInsumo(insumo = {}) {
  if (isVencido(insumo) || insumo.estado === 'vencido') return 'vencido';
  if (insumo.estado && insumo.estado !== 'disponible') return insumo.estado;
  if (isStockBajo(insumo)) return 'stock-bajo';
  if (isPorVencer(insumo)) return 'por-vencer';
  return null;
}
