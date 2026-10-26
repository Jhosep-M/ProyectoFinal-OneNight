import { useEffect, useState } from 'react';
import { listarPedidos, actualizarEstadoPedido, verPedido } from '../../services/pedidosService.js';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import ComandaCocina from '../../components/ventas/ComandaCocina.jsx';

const ACTIVOS = ['abierto', 'pendiente', 'en_preparacion', 'listo'];

const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `Bs ${n.toFixed(2)}`;
};

const horaMs = (p) => {
  const raw = p.fecha_pedido || p.fecha || p.created_at;
  if (!raw) return 0;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const minutosEspera = (p) => {
  const ms = horaMs(p);
  if (!ms) return 0;
  return Math.max(0, Math.round((Date.now() - ms) / 60000));
};

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState([]);
  const [detalles, setDetalles] = useState({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [avanzando, setAvanzando] = useState(null);
  const [printPedido, setPrintPedido] = useState(null);

  const recargar = async () => {
    try {
      const data = await listarPedidos();
      const list = Array.isArray(data) ? data : [];
      // Más viejos primero (prioridad cocina), activos primero.
      list.sort((a, b) => horaMs(a) - horaMs(b));
      setPedidos(list);
      // Detalle de productos por pedido (best-effort, no bloquea la lista).
      const activos = list.filter((p) => ACTIVOS.includes(p.estado)).slice(0, 20);
      const res = await Promise.all(
        activos.map(async (p) => {
          try {
            const full = await verPedido(p.id_pedido);
            return [p.id_pedido, full?.detalles || []];
          } catch {
            return [p.id_pedido, []];
          }
        })
      );
      setDetalles((prev) => {
        const next = { ...prev };
        for (const [id, det] of res) next[id] = det;
        return next;
      });
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

  const imprimir = (pedido) => {
    setPrintPedido(pedido);
    setTimeout(() => {
      try {
        window.print();
      } catch {
        /* noop */
      }
    }, 50);
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
          <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Mesa</th><th>Productos</th><th>Espera</th><th>Total</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {activos.map((p) => {
                const det = detalles[p.id_pedido] || p.detalles || [];
                const espera = minutosEspera(p);
                const urgente = espera >= 10 && (p.estado === 'abierto' || p.estado === 'pendiente');
                return (
                <tr key={p.id_pedido}>
                  <td><strong>{p.mesa_numero !== undefined && p.mesa_numero !== null ? `Mesa ${p.mesa_numero}` : 'Mostrador'}</strong></td>
                  <td>
                    {det.length > 0 ? (
                      <span>{det.map((d) => `${d.cantidad}x ${d.producto_nombre || 'Producto'}`).join(', ')}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span style={urgente ? { color: 'var(--error)', fontWeight: 700 } : undefined}>
                      {espera} min en espera
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(p.total)}</td>
                  <td><Badge tone={urgente ? 'error' : 'warning'}>{p.estado}</Badge></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', gap: 6 }}>
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
                    <Button size="sm" variant="secondary" onClick={() => imprimir(p)}>
                      Imprimir
                    </Button>
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>
      <div className="print-area" aria-hidden="true">
        {printPedido && (
          <ComandaCocina
            pedido={{
              ...printPedido,
              items: (detalles[printPedido.id_pedido] || []).map((d) => ({
                nombre: d.producto_nombre,
                cantidad: d.cantidad,
              })),
            }}
          />
        )}
      </div>
    </div>
  );
}
