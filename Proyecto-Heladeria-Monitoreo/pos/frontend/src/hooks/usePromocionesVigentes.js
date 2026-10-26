import { useEffect, useState } from 'react';
import { listarPromociones } from '../services/promotionsService.js';

export function esPromoVigente(p) {
  if (!p || p.estado !== 'activa') return false;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hoyISO = new Date().toISOString().slice(0, 10);
  if (p.fecha_inicio && new Date(p.fecha_inicio) < new Date(hoyISO)) return false;
  if (p.fecha_fin && new Date(p.fecha_fin) < hoy) return false;
  return true;
}

export function usePromocionesVigentes() {
  const [map, setMap] = useState(new Map());
  useEffect(() => {
    let viva = true;
    listarPromociones()
      .then((list) => {
        if (!viva) return;
        const m = new Map();
        for (const p of list || []) {
          if (!esPromoVigente(p)) continue;
          for (const x of p.productos || []) {
            const pid = String(x.producto_id || x.id_producto || '');
            if (pid && !m.has(pid)) m.set(pid, p);
          }
        }
        setMap(m);
      })
      .catch(() => {});
    return () => { viva = false; };
  }, []);
  return map;
}

export function precioConDescuento(precio, pct) {
  const n = Number(precio) || 0;
  const d = Number(pct) || 0;
  return n * (1 - d / 100);
}
