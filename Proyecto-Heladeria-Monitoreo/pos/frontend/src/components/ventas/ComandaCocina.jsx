// Comanda para cocina 80mm: grande, legible, sin precios ni IVA.
export default function ComandaCocina({ pedido }) {
  const p = pedido || {};
  const items = Array.isArray(p.items || p.detalles) ? (p.items || p.detalles) : [];
  const hora = p.fecha || p.fecha_pedido || p.created_at ? new Date(p.fecha || p.fecha_pedido || p.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '';
  const mesa = p.mesa_numero !== undefined && p.mesa_numero !== null ? `MESA ${p.mesa_numero}` : 'MOSTRADOR';
  return (
    <div className="print-ticket print-ticket--cocina" data-testid="comanda-cocina">
      <div className="print-ticket__title print-ticket__title--big">COCINA · {mesa}</div>
      <div className="print-ticket__meta">
        {hora && <span>Hora: {hora}</span>}
        {p.mesero_nombre && <span>Mesero: {p.mesero_nombre}</span>}
        {p.observacion && <span>Obs: {p.observacion}</span>}
      </div>
      <div className="print-ticket__sep" aria-hidden="true">- - - - - - - - - - - - - - -</div>
      <div>
        {items.map((it, i) => (
          <div key={i} className="print-ticket__line print-ticket__line--big">
            <span><strong>{it.cantidad} x </strong>{it.nombre || it.producto_nombre || 'Producto'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
