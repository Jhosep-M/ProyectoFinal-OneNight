const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

/**
 * Resuelve la URL pública de la foto de un producto.
 * - http(s) → tal cual (Storage público u otra CDN).
 * - 'productos/x.jpg' o 'x.jpg' → bucket público 'productos'.
 * - null → null (la card muestra placeholder).
 */
export function resolveProductoImagen(producto) {
  const raw = producto?.imagen_url || producto?.imagen;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.replace(/^productos\//, '').replace(/^\//, '');
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/productos/${path}`;
}
