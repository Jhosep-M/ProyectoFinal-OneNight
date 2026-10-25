// Normaliza para comparar nombres: trim + case-insensitive + colapsa espacios.
export const normalizarNombre = (s = '') =>
  s.trim().toLowerCase().replace(/\s+/g, ' ');

// true si ya existe otro producto ACTIVO con el mismo nombre normalizado
// en la misma categoria. excluirId = producto en edicion (no choca consigo mismo).
export function esNombreDuplicado(items = [], { nombre, categoria_id, excluirId = null }) {
  const norm = normalizarNombre(nombre || '');
  if (!norm) return false;
  const cat = categoria_id || '';
  return items.some(
    (p) =>
      (p.estado ?? 'activo') === 'activo' &&
      p.id_producto !== excluirId &&
      (p.categoria_id || '') === cat &&
      normalizarNombre(p.nombre || '') === norm
  );
}
