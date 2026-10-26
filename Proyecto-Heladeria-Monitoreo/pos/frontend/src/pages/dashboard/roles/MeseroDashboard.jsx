import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { listarMesas } from '../../../services/mesasService.js';
import { listarPedidos } from '../../../services/pedidosService.js';
import { listarTurnoAbiertoParaCobro } from '../../../services/cajaService.js';
import { formatTime } from '../../../utils/format.js';

const ACTIVOS = ['abierto', 'pendiente', 'en_preparacion', 'listo'];

export default function MeseroDashboard() {
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [turno, setTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    const [m, p, t] = await Promise.all([
      listarMesas().catch(() => []),
      listarPedidos().catch(() => []),
      listarTurnoAbiertoParaCobro().catch(() => null),
    ]);
    setMesas(m || []);
    setPedidos(p || []);
    setTurno(t || null);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        setLoading(true);
        await recargar();
        if (activo) setError(null);
      } catch {
        if (activo) setError('No se pudo cargar tu panel de mesero');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    const id = setInterval(() => { recargar().catch(() => {}); }, 15000);
    return () => { activo = false; clearInterval(id); };
  }, [recargar]);

  if (loading) return <div className="d-flex flex-column gap-3"><Skeleton height="120px" /><Skeleton height="220px" /></div>;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  const activos = pedidos.filter((p) => ACTIVOS.includes(p.estado));
  const ocupadas = mesas.filter((m) => m.estado === 'ocupada').length;
  const libres = mesas.length - ocupadas;
  const listos = activos.filter((p) => p.estado === 'listo').length;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-1" style={{ fontFamily: 'var(--bs-font-serif)' }}>Mis mesas y pedidos</h5>
          <p className="text-muted small mb-0">
            {turno ? `Caja abierta (${turno.cajero_email || 'caja'}) — puedes cobrar.` : 'Sin caja abierta — pide a caja abrir turno para cobrar.'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/mesero" className="btn btn-primary btn-sm"><i className="bi bi-plus-circle me-1"></i>Tomar pedido</Link>
          <Link to="/mesas" className="btn btn-outline-secondary btn-sm">Ver mesas</Link>
        </div>
      </div>

      <div className="row g-3">
        {[
          { titulo: 'Mesas ocupadas', valor: `${ocupadas}/${mesas.length}`, icono: 'bi-grid-3x3', color: 'warning' },
          { titulo: 'Mesas libres', valor: String(libres), icono: 'bi-check-circle', color: 'success' },
          { titulo: 'Pedidos activos', valor: String(activos.length), icono: 'bi-clipboard', color: 'info' },
          { titulo: 'Listos para entregar', valor: String(listos), icono: 'bi-bell', color: 'primary' },
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
          <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Pedidos por entregar</h5>
          <Badge variant={listos ? 'warning' : 'secondary'}>{listos} listos</Badge>
        </div>
        {activos.length === 0 ? (
          <EmptyState icon="bi-clipboard" title="Sin pedidos activos" description="Toma el primer pedido desde la vista Mesero." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr><th>Mesa</th><th>Estado</th><th>Hora</th><th>Acción</th></tr></thead>
              <tbody>
                {activos.slice(0, 10).map((p) => (
                  <tr key={p.id_pedido}>
                    <td className="fw-semibold">{p.mesa_numero != null ? `Mesa ${p.mesa_numero}` : 'Mostrador'}</td>
                    <td><Badge variant={p.estado === 'listo' ? 'success' : 'warning'}>{p.estado}</Badge></td>
                    <td className="text-muted">{formatTime(p.creado_en || p.fecha || p.created_at)}</td>
                    <td><Link to="/mesero" className="btn btn-sm btn-outline-primary">Gestionar</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
