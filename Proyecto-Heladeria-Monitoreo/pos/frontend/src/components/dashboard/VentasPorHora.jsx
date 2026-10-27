import { useMemo, useState } from 'react';
import { formatCurrency } from '../../utils/format.js';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizar(porHora) {
  if (!Array.isArray(porHora)) return Array.from({ length: 24 }, () => ({ total: 0, count: 0 }));
  return Array.from({ length: 24 }, (_, h) => {
    const v = porHora[h];
    if (v == null) return { total: 0, count: 0 };
    if (typeof v === 'number') return { total: v, count: 0 };
    return { total: Number(v.total) || 0, count: Number(v.count) || 0 };
  });
}

export default function VentasPorHora({ porHora, totalDia = 0 }) {
  const datos = useMemo(() => normalizar(porHora), [porHora]);
  const [seleccion, setSeleccion] = useState(null);
  const [hover, setHover] = useState(null);

  const maxTotal = useMemo(() => Math.max(1, ...datos.map((d) => d.total)), [datos]);
  const dia = totalDia || datos.reduce((s, d) => s + d.total, 0);
  const horaPico = useMemo(() => {
    let idx = 0;
    datos.forEach((d, h) => { if (d.total > datos[idx].total) idx = h; });
    return idx;
  }, [datos]);
  const horasConVenta = datos.filter((d) => d.total > 0).length;

  const activa = hover ?? seleccion;
  const detalle = activa != null ? { h: activa, ...datos[activa] } : null;
  const porcDia = detalle && dia > 0 ? (detalle.total / dia) * 100 : 0;
  const ticket = detalle && detalle.count > 0 ? detalle.total / detalle.count : 0;

  const elegir = (h) => setSeleccion((prev) => (prev === h ? null : h));

  return (
    <div className="vxh">
      <div
        className="vxh-chart"
        role="group"
        aria-label="Ventas por hora, hoy. Usa Tab para recorrer las horas y Enter para fijar el detalle."
      >
        {datos.map((d, h) => {
          const pct = Math.max(4, (d.total / maxTotal) * 100);
          const esPico = d.total > 0 && h === horaPico;
          const esActiva = activa === h;
          const etiqueta = `${pad2(h)}:00 — ${formatCurrency(d.total)}${d.count ? ` · ${d.count} venta${d.count === 1 ? '' : 's'}` : ''}${esPico ? ' · pico' : ''}`;
          return (
            <div key={h} className="vxh-col">
              {hover === h && d.total > 0 && (
                <div className="vxh-tip" aria-hidden="true">
                  <strong>{pad2(h)}:00</strong>
                  <span>{formatCurrency(d.total)}</span>
                  {d.count > 0 && <span>{d.count} venta{d.count === 1 ? '' : 's'}</span>}
                  {esPico && <em>Pico</em>}
                </div>
              )}
              <button
                type="button"
                className={`vxh-bar${d.total > 0 ? ' vxh-bar--con' : ''}${esPico ? ' vxh-bar--pico' : ''}${esActiva ? ' vxh-bar--activa' : ''}`}
                style={{ height: `${pct}%` }}
                title={etiqueta}
                aria-label={etiqueta}
                aria-pressed={seleccion === h}
                onClick={() => elegir(h)}
                onMouseEnter={() => setHover(h)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(h)}
                onBlur={() => setHover(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setSeleccion(null); setHover(null); }
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="vxh-eje" aria-hidden="true">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>

      <div className="vxh-detalle" aria-live="polite">
        {detalle ? (
          <div className="vxh-detalle__fila">
            <span className="vxh-detalle__hora">{pad2(detalle.h)}:00 – {pad2(detalle.h)}:59</span>
            <span className="vxh-detalle__monto">{formatCurrency(detalle.total)}</span>
            <span className="vxh-detalle__meta">
              {detalle.count > 0 ? `${detalle.count} venta${detalle.count === 1 ? '' : 's'} · ticket ${formatCurrency(ticket)} · ` : ''}
              {porcDia.toFixed(1)}% del día
              {detalle.h === horaPico && detalle.total > 0 ? ' · Pico' : ''}
            </span>
            {seleccion != null && (
              <button type="button" className="vxh-limpiar" onClick={() => setSeleccion(null)}>
                Quitar
              </button>
            )}
          </div>
        ) : (
          <div className="vxh-detalle__fila vxh-detalle__fila--vacia">
            <span>
              Hora pico: <strong>{pad2(horaPico)}:00 ({formatCurrency(datos[horaPico].total)})</strong>
              {' · '}{horasConVenta}/24 horas con venta · pasa el cursor o toca una barra para el detalle
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
