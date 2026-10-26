import { useEffect, useState } from 'react';
import { listarPedidos, actualizarEstadoPedido } from '../../services/pedidosService.js';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';

const ACTIVOS = ['abierto', 'pendiente', 'en_preparacion', 'listo'];

const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `Bs ${n.toFixed(2)}`;
};

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [avanzando, setAvanzando] = useState(null);

  const recargar = async () => {
    try {
      const data = await listarPedidos();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message || 'No se pudieron cargar los pedidos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    recargar();
    const id = setInterval(() => {
      recargar().catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const activos = (Array.isArray(pedidos) ? pedidos : []).filter((p) => ACTIVOS.includes(p.estado));

  const avanzar = async (pedido, siguiente) => {
    setAlert(null);
    setAvanzando(pedido.id_pedido);
    try {
      await actualizarEstadoPedido(pedido.id_pedido, siguiente);
      await recargar();
    } catch (e) {
      setAlert({ tone: 'error', message: e.message || 'No se pudo avanzar el pedido' });
    } finally {
      setAvanzando(null);
    }
  };

  return (
    <div>
      <h1>Cocina</h1>
      <p className="text-muted">Solo pendientes: abierto → en preparación → listo. Sin ventas ni caja.</p>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <Card title={`En cocina (${activos.length})`} actions={<Button variant="secondary" size="sm" onClick={recargar}>Recargar</Button>}>
        {loading ? (
          <p>Cargando…</p>
        ) : activos.length === 0 ? (
          <p>Sin pedidos en cocina.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Mesa</th><th>Total</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {activos.map((p) => (
                <tr key={p.id_pedido}>
                  <td><strong>{p.mesa_numero !== undefined && p.mesa_numero !== null ? `Mesa ${p.mesa_numero}` : 'Mostrador'}</strong></td>
                  <td>{fmtMoney(p.total)}</td>
                  <td><Badge tone="warning">{p.estado}</Badge></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {(p.estado === 'abierto' || p.estado === 'pendiente') && (
                      <Button
                        size="sm"
                        onClick={() => avanzar(p, 'en_preparacion')}
                        loading={avanzando === p.id_pedido}
                        disabled={avanzando === p.id_pedido}
                      >
                        A preparación
                      </Button>
                    )}
                    {p.estado === 'en_preparacion' && (
                      <Button
                        size="sm"
                        onClick={() => avanzar(p, 'listo')}
                        loading={avanzando === p.id_pedido}
                        disabled={avanzando === p.id_pedido}
                      >
                        Listo
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
