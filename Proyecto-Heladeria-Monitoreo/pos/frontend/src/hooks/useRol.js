import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api.js';

/**
 * Obtiene el rol del usuario autenticado vía GET /me/rol.
 * Backend deriva el rol del JWT (AGENTS §4.1), nunca del frontend.
 * Normaliza a minúsculas: 'admin' | 'supervisor' | 'cajero' | 'mesero' | 'inventario' | 'cocinero' | null
 */
// Cache 5min: el rol casi no cambia y cada montaje pedía GET /me/rol.
// Reduce presión sobre el readLimiter (causa de 429).
const ROL_TTL_MS = 5 * 60 * 1000;
let rolCache = { data: null, ts: 0 };
export function __resetRolCache() { rolCache = { data: null, ts: 0 }; }
export function useRol() {
  const [rol, setRol] = useState(() =>
    Date.now() - rolCache.ts < ROL_TTL_MS ? rolCache.data : null,
  );
  const [loading, setLoading] = useState(() => !(Date.now() - rolCache.ts < ROL_TTL_MS && rolCache.data));

  useEffect(() => {
    let activo = true;
    if (Date.now() - rolCache.ts < ROL_TTL_MS && rolCache.data) {
      setRol(rolCache.data);
      setLoading(false);
      return () => { activo = false; };
    }
    (async () => {
      try {
        const r = await apiFetch('/me/rol');
        const nombre = String(r?.rol || '').trim().toLowerCase() || null;
        if (nombre) rolCache = { data: nombre, ts: Date.now() };
        if (activo) setRol(nombre);
      } catch {
        if (activo) setRol(null);
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  return { rol, loading };
}

export function inferirRolFallback({ rol, tienePermiso }) {
  // Rol directo cuando el backend lo devuelve.
  if (rol) return rol;
  // Fallback por permisos (ej. cocinero sin rol sembrado aún:
  // solo tiene pedido.estado para operar cocina).
  if (typeof tienePermiso !== 'function') return null;
  const puedeVender = tienePermiso('venta.consultar');
  const puedeCaja = tienePermiso('turno.consultar');
  const puedeInventario = tienePermiso('inventario.consultar');
  const puedeCocina = tienePermiso('pedido.estado');
  const puedePedidos = tienePermiso('pedido.consultar');
  if (puedeCocina && !puedeVender && !puedeCaja && !puedeInventario) return 'cocinero';
  if (puedePedidos && !puedeVender && !puedeCaja) return 'mesero';
  if (puedeInventario && !puedeVender && !puedeCaja) return 'inventario';
  if (puedeCaja && !puedeInventario) return 'cajero';
  return null;
}
