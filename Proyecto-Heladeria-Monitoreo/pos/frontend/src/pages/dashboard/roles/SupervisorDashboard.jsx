import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import { formatCurrency, formatTime } from '../../../utils/format.js';
import { listarVentas } from '../../../services/ventasService.js';
import { listarMesas } from '../../../services/mesasService.js';
import { listarPedidos } from '../../../services/pedidosService.js';
import { listarTodosTurnos } from '../../../services/cajaService.js';

const normVenta = (v) => ({
  ...v,
  id: v.id_venta || v.id,
  total: Number(v.total) || 0,
  estado: v.estado === 'anulada' ? 'anulado' : v.estado === 'activa' ? 'completado' : v.estado,
});

export default function SupervisorDashboard() {
  const [ventas, setVentas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    const [vta, mes, ped, tur] = await Promise.all([
      listarVentas().catch(() => []),
      listarMesas().catch(() => []),
      listarPedidos().catch(() => []),
      listarTodosTurnos().catch(() => []),
    ]);
    setVentas((vta || []).map(normVenta));
    setMesas(mes || []);
    setPedidos(ped || []);
    setTurnos(Array.isArray(tur) ? tur : []);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        setLoading(true);
        await recargar();
        if (activo) setError(null);
      } catch {
        if (activo) setError('No se pudo cargar el panel de supervisión');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    const id = setInterval(() => { recargar().catch(() => {}); }, 15000);
    return () => { activo = false; clearInterval(id); };
  }, [recargar]);

  if (loading) return <div className="d-flex flex-column gap-3"><Skeleton height="120px" /><Skeleton height="220px" /></div>;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  const validas = ventas.filter((v) => v.estado !== 'anulado');
  const total = validas.reduce((s, v) => s + (v.total || 0), 0);
  const ocupadas = mesas.filter((m) => m.estado === 'ocupada').length;
  const abiertos = turnos.filter((t) => t.estado === 'abierto');
  const cocina = pedidos.filter((p) => ['abierto', 'pendiente', 'en_preparacion', 'listo'].includes(p.estado));

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-1" style={{ fontFamily: 'var(--bs-font-serif)' }}>Supervisión operativa</h5>
          <p className="text-muted small mb-0">{abiertos.length} turnos abiertos · {cocina.length} en cocina · {ocupadas}/{mesas.length} mesas ocupadas.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/admin/turnos" className="btn btn-outline-secondary btn-sm">Ver turnos</Link>
          <Link to="/auditoria" className="btn btn-outline-secondary btn-sm">Auditoría</Link>
          <Link to="/reportes" className="btn btn-primary btn-sm">Reportes</Link>
        </div>
      </div>

      <div className="row g-3">
        {[
          { titulo: 'Ventas del día', valor: formatCurrency(total), icono: 'bi-cash-stack', color: 'success' },
          { titulo: 'Transacciones', valor: String(ventas.length), icono: 'bi-receipt', color: 'info' },
          { titulo: 'Ticket promedio', valor: validas.length ? formatCurrency(total / validas.length) : formatCurrency(0), icono: 'bi-graph-up', color: 'primary' },
          { titulo: 'Anuladas', valor: String(ventas.length - validas.length), icono: 'bi-x-circle', color: 'danger' },
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

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <Card>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Turnos abiertos</h5>
              <Badge variant={abiertos.length ? 'warning' : 'secondary'}>{abiertos.length} abiertos</Badge>
            </div>
            {abiertos.length === 0 ? (
              <p className="text-muted small mb-0">Sin turnos abiertos.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead><tr><th>Cajero</th><th>Apertura</th><th>Acción</th></tr></thead>
                  <tbody>
                    {abiertos.slice(0, 6).map((t) => (
                      <tr key={t.id_turno || t.id}>
                        <td className="text-muted">{t.cajero_email || t.cajero || '—'}</td>
                        <td className="text-muted">{formatTime(t.fecha_apertura || t.created_at)}</td>
                        <td><Link to="/admin/turnos" className="btn btn-sm btn-outline-secondary">Revisar</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <div className="col-12 col-lg-6">
          <Card>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Cocina y mesas</h5>
              <Badge variant="info">{cocina.length} en cocina</Badge>
            </div>
            <p className="small text-muted mb-2">Mesas ocupadas {ocupadas}/{mesas.length} · Pedidos activos {cocina.length}</p>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/cocina" className="btn btn-sm btn-outline-primary">Cocina</Link>
              <Link to="/mesas" className="btn btn-sm btn-outline-primary">Mesas</Link>
              <Link to="/pedidos" className="btn btn-sm btn-outline-primary">Pedidos</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
