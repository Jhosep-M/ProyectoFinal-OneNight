import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api.js';

/**
 * Obtiene el rol del usuario autenticado vía GET /me/rol.
 * Backend deriva el rol del JWT (AGENTS §4.1), nunca del frontend.
 * Normaliza a minúsculas: 'admin' | 'supervisor' | 'cajero' | 'mesero' | 'inventario' | 'cocinero' | null
 */
export function useRol() {
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const r = await apiFetch('/me/rol');
        const nombre = String(r?.rol || '').trim().toLowerCase();
        if (activo) setRol(nombre || null);
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
