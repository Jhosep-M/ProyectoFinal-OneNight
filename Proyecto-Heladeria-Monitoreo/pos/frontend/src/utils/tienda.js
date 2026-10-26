// Config pública de la tienda para tickets imprimibles (sin NIT por decisión de negocio).
// Se lee de variables VITE_* (no requiere permiso backend, cajero puede imprimir).
export function getTiendaConfig() {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  return {
    nombre: env.VITE_STORE_NAME || 'Heladería Artesanal',
    direccion: env.VITE_STORE_ADDRESS || '',
    telefono: env.VITE_STORE_PHONE || '',
  };
}
