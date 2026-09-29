// Clasifica una cantidad contra los umbrales activos de la organización.
// Rango = [limite_inferior, limite_superior): inclusivo abajo, exclusivo arriba.
// Sin banda cubriendo la cantidad → 'sin_umbral' (NO alerta: mejor sin alerta
// que una alerta falsa; la ausencia de cobertura queda visible en el registro).
function clasificar(cantidad, umbrales) {
  const c = Number(cantidad);
  if (!Number.isFinite(c)) return { nivel: 'sin_umbral', umbralId: null };
  const orden = [...(umbrales || [])]
    .sort((a, b) => Number(a.limite_inferior) - Number(b.limite_inferior));
  const hit = orden.find((u) => c >= Number(u.limite_inferior) && c < Number(u.limite_superior));
  if (!hit) return { nivel: 'sin_umbral', umbralId: null };
  return { nivel: hit.nivel, umbralId: hit.id };
}

module.exports = { clasificar };
