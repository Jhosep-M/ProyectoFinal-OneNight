import { useState } from 'react';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';

export default function DetalleCliente({ detalle, ventas = [], onClose }) {
  const [tab, setTab] = useState('movimientos');
  const movimientos = detalle?.movimientos_puntos || [];
  const listaVentas = Array.isArray(ventas) ? ventas : [];

  return (
    <Card title={`Detalle: ${detalle?.nombre}`}>
      <p>Puntos: {detalle?.puntos_fidelidad}</p>
      <div className="row-inline">
        <Button size="sm" variant={tab === 'movimientos' ? 'primary' : 'secondary'} onClick={() => setTab('movimientos')}>
          Movimientos
        </Button>
        <Button size="sm" variant={tab === 'ventas' ? 'primary' : 'secondary'} onClick={() => setTab('ventas')}>
          Ventas
        </Button>
      </div>

      {tab === 'movimientos' && (
        <table className="data-table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Puntos</th><th>Motivo</th></tr></thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id_movimiento}>
                <td>{m.fecha ? new Date(m.fecha).toLocaleString() : '—'}</td>
                <td>{m.tipo}</td>
                <td>{m.puntos}</td>
                <td>{m.motivo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'ventas' && (
        listaVentas.length === 0 ? (
          <p>Sin ventas</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {listaVentas.map((v, i) => (
                <tr key={v.id_venta || v.id || i}>
                  <td>{v.fecha || v.fecha_venta ? new Date(v.fecha || v.fecha_venta).toLocaleString() : '—'}</td>
                  <td>{v.total}</td>
                  <td>{v.estado || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      <Button size="sm" variant="secondary" onClick={onClose}>Cerrar</Button>
    </Card>
  );
}
