import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { listarPedidos, actualizarEstadoPedido } from '../../../services/pedidosService.js';
import { formatTime } from '../../../utils/format.js';

const ACTIVOS = ['abierto', 'pendiente', 'en_preparacion', 'listo'];

function fechaListoMs(p) {
  const d = new Date(p.fecha_listo || null);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function minutosEnEspera(p) {
  const f = new Date(p.creado_en || p.fecha || p.created_at);
  if (Number.isNaN(f.getTime())) return null;
  // Congelado en listo (migracion 026): usa fecha_listo - creacion.
  if (p.estado === 'listo') {
    const fin = fechaListoMs(p);
    if (fin) return Math.max(0, Math.round((fin - f.getTime()) / 60000));
  }
  return Math.round((Date.now() - f.getTime()) / 60000);
}

function textoEspera(p) {
  const min = minutosEnEspera(p);
  if (min == null) return '—';
  return p.estado === 'listo' && fechaListoMs(p) ? `tardó ${min} min` : `${min} min`;
}

export default function CocinaDashboard() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avanzando, setAvanzando] = useState(null);

  const recargar = useCallback(async () => {
    const data = await listarPedidos();
    setPedidos(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        setLoading(true);
        await recargar();
        if (activo) setError(null);
      } catch {
        if (activo) setError('No se pudo cargar el panel de cocina');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    const id = setInterval(() => { recargar().catch(() => {}); }, 10000);
    return () => { activo = false; clearInterval(id); };
  }, [recargar]);

  const avanzar = async (pedido, siguiente) => {
    setAvanzando(pedido.id_pedido);
    // Optimista: congela el contador al instante (AGENTS §15.2).
    if (siguiente === 'listo') {
      const ahora = new Date().toISOString();
      setPedidos((prev) => prev.map((x) => (x.id_pedido === pedido.id_pedido ? { ...x, estado: 'listo', fecha_listo: x.fecha_listo || ahora } : x)));
    } else {
      setPedidos((prev) => prev.map((x) => (x.id_pedido === pedido.id_pedido ? { ...x, estado: siguiente } : x)));
    }
    try {
      await actualizarEstadoPedido(pedido.id_pedido, siguiente);
      await recargar();
    } catch {
      setError('No se pudo avanzar el pedido');
    } finally {
      setAvanzando(null);
    }
  };

  if (loading) return <div className="d-flex flex-column gap-3"><Skeleton height="120px" /><Skeleton height="220px" /></div>;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  const activos = pedidos.filter((p) => ACTIVOS.includes(p.estado));
  const porEstado = {
    abierto: activos.filter((p) => ['abierto', 'pendiente'].includes(p.estado)).length,
    en_preparacion: activos.filter((p) => p.estado === 'en_preparacion').length,
    listo: activos.filter((p) => p.estado === 'listo').length,
  };
  const retrasados = activos.filter((p) => p.estado !== 'listo' && (minutosEnEspera(p) ?? 0) > 20).length;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-1" style={{ fontFamily: 'var(--bs-font-serif)' }}>Cocina — cola de producción</h5>
          <p className="text-muted small mb-0">Abierto → en preparación → listo. Sin ventas ni caja.</p>
        </div>
        <Link to="/cocina" className="btn btn-primary btn-sm"><i className="bi bi-fire me-1"></i>Ir a cocina</Link>
      </div>

      <div className="row g-3">
        {[
          { titulo: 'Por preparar', valor: String(porEstado.abierto), icono: 'bi-inbox', color: 'warning' },
          { titulo: 'En preparación', valor: String(porEstado.en_preparacion), icono: 'bi-fire', color: 'info' },
          { titulo: 'Listos', valor: String(porEstado.listo), icono: 'bi-check-circle', color: 'success' },
          { titulo: 'Retrasados +20min', valor: String(retrasados), icono: 'bi-alarm', color: 'danger' },
        ].map((m) => (
          <div key={m.titulo} className="col-12 col-md-6 col-xl-3">
            <Card className="h-100">
              <div className="d-flex align-items-center">
                <div className={`rounded-circle bg-soft-${m.color} p-3 me-3`}><i className={`bi ${m.icono} text-${m.color} fs-5`}></i></div>
                <div>
                  <div className="text-muted small text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>{m.titulo}</div>
                  <div className="fw-bold fs-4" style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{m.valor}</div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <Card>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>En cocina ({activos.length})</h5>
          <Badge variant={retrasados ? 'danger' : 'secondary'}>{retrasados} retrasados</Badge>
        </div>
        {activos.length === 0 ? (
          <EmptyState icon="bi-egg-fried" title="Sin pedidos en cocina" description="Cuando mesero tome un pedido aparecerá aquí." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr><th>Mesa</th><th>Estado</th><th>Espera</th><th>Hora</th><th className="text-end">Acción</th></tr></thead>
              <tbody>
                {activos.slice(0, 12).map((p) => {
                  const min = minutosEnEspera(p);
                  return (
                    <tr key={p.id_pedido}>
                      <td className="fw-semibold">{p.mesa_numero != null ? `Mesa ${p.mesa_numero}` : 'Mostrador'}</td>
                      <td><Badge variant={p.estado === 'listo' ? 'success' : min > 20 ? 'danger' : 'warning'}>{p.estado}</Badge></td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{textoEspera(p)}</td>
                      <td className="text-muted">{formatTime(p.creado_en || p.fecha || p.created_at)}</td>
                      <td className="text-end">
                        {['abierto', 'pendiente'].includes(p.estado) && (
                          <button type="button" className="btn btn-sm btn-primary" disabled={avanzando === p.id_pedido} onClick={() => avanzar(p, 'en_preparacion')}>
                            {avanzando === p.id_pedido ? '…' : 'A preparación'}
                          </button>
                        )}
                        {p.estado === 'en_preparacion' && (
                          <button type="button" className="btn btn-sm btn-success ms-2" disabled={avanzando === p.id_pedido} onClick={() => avanzar(p, 'listo')}>
                            {avanzando === p.id_pedido ? '…' : 'Listo'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
