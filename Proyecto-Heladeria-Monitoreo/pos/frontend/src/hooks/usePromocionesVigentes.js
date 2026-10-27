import { useEffect, useState } from 'react';
import { listarPromociones } from '../services/promotionsService.js';

export function esPromoVigente(p) {
  if (!p || p.estado !== 'activa') return false;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (p.fecha_inicio) {
    const ini = new Date(p.fecha_inicio);
    ini.setHours(0, 0, 0, 0);
    if (ini > hoy) return false;
  }
  if (p.fecha_fin) {
    const fin = new Date(p.fecha_fin);
    fin.setHours(0, 0, 0, 0);
    if (fin < hoy) return false;
  }
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

export function promoDeProducto(producto, promoMap) {
  if (!producto || !promoMap || typeof promoMap.get !== 'function') return null;
  const pid = String(producto.id_producto || producto.id || '');
  if (!pid) return null;
  return promoMap.get(pid) || null;
}

export function precioFinalProducto(producto, promoMap) {
  const base = Number(producto?.precio) || 0;
  const promo = promoDeProducto(producto, promoMap);
  if (!promo) return base;
  return precioConDescuento(base, promo.porcentaje_descuento);
}

function redondear2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// bruto = suma a precio base, neto = suma con promo aplicada,
// descuento = bruto - neto (>= 0). Todos los productos marcados
// en promocion_producto via promoMap entran al cálculo.
export function calcularDescuentoTicket(ticket, promoMap) {
  const items = Array.isArray(ticket) ? ticket : [];
  let bruto = 0;
  let neto = 0;
  for (const i of items) {
    const cant = Number(i?.cantidad) || 0;
    const base = Number(i?.precio) || 0;
    const promo = promoMap && typeof promoMap.get === 'function'
      ? promoMap.get(String(i?.id_producto || i?.id || ''))
      : null;
    const final = promo ? precioConDescuento(base, promo?.porcentaje_descuento) : base;
    bruto += base * cant;
    neto += final * cant;
  }
  bruto = redondear2(bruto);
  neto = redondear2(neto);
  const descuento = redondear2(Math.max(0, bruto - neto));
  return { bruto, neto, descuento };
}
