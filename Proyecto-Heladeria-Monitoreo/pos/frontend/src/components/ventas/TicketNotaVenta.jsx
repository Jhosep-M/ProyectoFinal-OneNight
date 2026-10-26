import { formatCurrency } from '../../utils/format.js';
import { getTiendaConfig } from '../../utils/tienda.js';

const tienda = () => {
  try {
    return getTiendaConfig();
  } catch {
    return { nombre: 'Heladería Artesanal', direccion: '', telefono: '' };
  }
};

const shortId = (id) => (id ? String(id).slice(0, 8) : '—');

// Nota de venta 80mm — sin IVA, sin NIT. Solo tokens tipográficos (AGENTS §15.1).
export default function TicketNotaVenta({ venta }) {
  const t = tienda();
  const v = venta || {};
  const items = Array.isArray(v.items) ? v.items : [];
  const fecha = v.fecha ? new Date(v.fecha).toLocaleString('es-BO') : new Date().toLocaleString('es-BO');
  return (
    <div className="print-ticket" data-testid="nota-venta">
      <div className="print-ticket__head">
        <div className="print-ticket__store">{t.nombre}</div>
        {t.direccion && <div className="print-ticket__muted">{t.direccion}</div>}
        {t.telefono && <div className="print-ticket__muted">Tel: {t.telefono}</div>}
        <div className="print-ticket__title">NOTA DE VENTA</div>
      </div>
      <div className="print-ticket__meta">
        <span>N° #{shortId(v.id)}</span>
        <span>{fecha}</span>
        {v.cajero && <span>Cajero: {v.cajero}</span>}
        {v.turno && <span>Turno: #{shortId(v.turno)}</span>}
        {v.cliente && <span>Cliente: {v.cliente}</span>}
      </div>
      <div className="print-ticket__sep" aria-hidden="true">- - - - - - - - - - - - - - -</div>
      <div>
        {items.map((it, i) => (
          <div key={i} className="print-ticket__line">
            <span>{it.cantidad} x {it.nombre}</span>
            <span className="print-ticket__amount">{formatCurrency((Number(it.precio) || 0) * (Number(it.cantidad) || 0))}</span>
          </div>
        ))}
      </div>
      <div className="print-ticket__sep" aria-hidden="true">- - - - - - - - - - - - - - -</div>
      <div className="print-ticket__line print-ticket__total">
        <span>Subtotal</span>
        <span className="print-ticket__amount">{formatCurrency(v.total ?? 0)}</span>
      </div>
      <div className="print-ticket__line print-ticket__total">
        <span>Total</span>
        <span className="print-ticket__amount">{formatCurrency(v.total ?? 0)}</span>
      </div>
      {v.metodoPago && <div className="print-ticket__meta"><span>Pago: {v.metodoPago}</span></div>}
      <div className="print-ticket__foot">Gracias por su compra</div>
    </div>
  );
}
