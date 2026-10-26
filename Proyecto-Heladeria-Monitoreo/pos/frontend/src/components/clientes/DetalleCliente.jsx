import { useState } from 'react';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { formatCurrency } from '../../utils/format.js';

// Montos con token numérico + tabular-nums (AGENTS §15.1), igual que HistorialVentas.
const montoStyle = {
  fontFamily: 'var(--bs-font-numeric)',
  fontVariantNumeric: 'tabular-nums',
};

export default function DetalleCliente({ detalle, ventas = [], onClose }) {
  const [tab, setTab] = useState('movimientos');
  const movimientos = detalle?.movimientos_puntos || [];
  const listaVentas = Array.isArray(ventas) ? ventas : [];
  const puntos = Math.trunc(Number(detalle?.puntos_fidelidad ?? 0));

  return (
    <div className="sys-modal-backdrop" onClick={onClose}>
      <div className="sys-modal sys-modal--lg" role="alertdialog" aria-modal="true" aria-label={`Detalle: ${detalle?.nombre}`} onClick={(e) => e.stopPropagation()}>
        <div className="sys-modal-header">
          <h3>Detalle: {detalle?.nombre}</h3>
          <button type="button" className="sys-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="sys-modal-body">
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-label">Puntos</div>
              <div className="kpi-value kpi-value-accent">{puntos}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Regla</div>
              <div className="kpi-value">30 Bs = 1</div>
            </div>
          </div>
          <p className="field-hint">{detalle?.telefono ?? ''} · {detalle?.correo ?? ''}</p>
          <div className="segmented" role="tablist" aria-label="Secciones del cliente">
            <button type="button" role="tab" aria-pressed={tab === 'movimientos'} onClick={() => setTab('movimientos')}>
              Movimientos ({movimientos.length})
            </button>
            <button type="button" role="tab" aria-pressed={tab === 'ventas'} onClick={() => setTab('ventas')}>
              Ventas ({listaVentas.length})
            </button>
          </div>

          {tab === 'movimientos' && (
            movimientos.length === 0 ? (
              <EmptyState title="Sin movimientos" description="Ajusta puntos o registra una venta con este cliente." />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Fecha</th><th>Tipo</th><th className="numeric">Puntos</th><th>Motivo</th></tr></thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <tr key={m.id_movimiento}>
                        <td>{m.fecha ? new Date(m.fecha).toLocaleString() : '—'}</td>
                        <td><Badge tone={m.tipo === 'canje' ? 'warning' : m.puntos < 0 ? 'error' : 'info'}>{m.tipo}</Badge></td>
                        <td className="numeric">{Math.trunc(Number(m.puntos ?? 0))}</td>
                        <td>{m.motivo || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'ventas' && (
            listaVentas.length === 0 ? (
              <EmptyState title="Sin ventas" description="Este cliente aún no tiene ventas asociadas." />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Fecha</th><th className="numeric">Total</th><th>Estado</th></tr></thead>
                  <tbody>
                    {listaVentas.map((v, i) => (
                      <tr key={v.id_venta || v.id || i}>
                        <td>{v.fecha || v.fecha_venta ? new Date(v.fecha || v.fecha_venta).toLocaleString() : '—'}</td>
                        <td className="numeric" style={montoStyle}>{v.total != null ? formatCurrency(v.total) : '—'}</td>
                        <td><Badge tone={v.estado === 'activa' ? 'success' : 'neutral'}>{v.estado || '—'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
        <div className="sys-modal-footer">
          <Button size="sm" variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}
