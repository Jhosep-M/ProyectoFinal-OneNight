/**
 * Helpers puros Bloque 2 Step 1: no delete fisico, solo inactivar.
 * Bloquea inactivar si hay dependencias historicas.
 */

function canInactivateProduct({ detalleCount }) {
  return Number(detalleCount || 0) === 0;
}

function canInactivateCategory({ productCount }) {
  return Number(productCount || 0) === 0;
}

function isStockBajo({ stock, stock_minimo }) {
  return Number(stock ?? 0) <= Number(stock_minimo ?? 0);
}

module.exports = { canInactivateProduct, canInactivateCategory, isStockBajo };
