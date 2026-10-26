import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { formatCurrency, formatTime } from '../../../utils/format.js';
import { listarMisTurnos } from '../../../services/cajaService.js';
import { listarVentas } from '../../../services/ventasService.js';
import { listarAlertasMonitoreo } from '../../../services/alertasService.js';

const normVenta = (v) => ({
  ...v,
  id: v.id_venta || v.id,
  total: Number(v.total) || 0,
  estado: v.estado === 'anulada' ? 'anulado' : v.estado === 'activa' ? 'completado' : v.estado,
});

export default function CajeroDashboard() {
  const [turnos, setTurnos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    const [mis, vta, ale] = await Promise.all([
      listarMisTurnos(),
      listarVentas(),
      listarAlertasMonitoreo({ limit: 5 }).catch(() => ({ data: [] })),
    ]);
    setTurnos(mis || []);
    setVentas((vta || []).map(normVenta));
    setAlertas(ale?.data || []);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        setLoading(true);
        await recargar();
        if (activo) setError(null);
      } catch {
        if (activo) setError('No se pudo cargar tu panel de caja');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    const id = setInterval(() => { recargar().catch(() => {}); }, 15000);
    const onFocus = () => { recargar().catch(() => {}); };
    window.addEventListener('focus', onFocus);
    return () => { activo = false; clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [recargar]);

  if (loading) {
    return <div className="d-flex flex-column gap-3"><Skeleton height="120px" /><Skeleton height="220px" /></div>;
  }
  if (error) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  const turnoActivo = turnos.find((t) => t.estado === 'abierto') || null;
  const turnoId = turnoActivo?.id_turno || turnoActivo?.id || null;
  const ventasTurno = turnoId ? ventas.filter((v) => (v.turno_id || v.turnoId) === turnoId) : [];
  const totalTurno = ventasTurno.filter((v) => v.estado !== 'anulado').reduce((s, v) => s + (v.total || 0), 0);
  const ultimas = [...ventasTurno]
    .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at))
    .slice(0, 8);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-1" style={{ fontFamily: 'var(--bs-font-serif)' }}>Mi caja</h5>
          <p className="text-muted small mb-0">
            {turnoActivo
              ? `Turno abierto · ${formatTime(turnoActivo.fecha_apertura || turnoActivo.created_at)}`
              : 'Sin turno abierto — abre caja para vender.'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/ventas" className="btn btn-primary btn-sm"><i className="bi bi-cart me-1"></i>Nueva venta</Link>
          <Link to="/caja" className="btn btn-outline-secondary btn-sm"><i className="bi bi-cash-register me-1"></i>Ir a caja</Link>
        </div>
      </div>

      <div className="row g-3">
        {[
          { titulo: 'Vendido en mi turno', valor: formatCurrency(totalTurno), icono: 'bi-cash-stack', color: 'success' },
          { titulo: 'Transacciones', valor: String(ventasTurno.length), icono: 'bi-receipt', color: 'info' },
          { titulo: 'Ticket promedio', valor: ventasTurno.length ? formatCurrency(totalTurno / ventasTurno.length) : formatCurrency(0), icono: 'bi-graph-up', color: 'primary' },
          { titulo: 'Estado turno', valor: turnoActivo ? 'Abierto' : 'Cerrado', icono: 'bi-clock', color: turnoActivo ? 'success' : 'warning' },
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
          <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Mis últimas ventas del turno</h5>
          <Badge variant="secondary">{ultimas.length} ventas</Badge>
        </div>
        {ultimas.length === 0 ? (
          <EmptyState icon="bi-receipt" title="Sin ventas en este turno" description="Cobra desde Ventas y aparecerán aquí automáticamente." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr><th>#</th><th>Hora</th><th>Total</th><th>Estado</th></tr></thead>
              <tbody>
                {ultimas.map((v) => (
                  <tr key={v.id}>
                    <td className="fw-semibold">#{String(v.id).slice(0, 8)}</td>
                    <td className="text-muted">{formatTime(v.fecha || v.created_at)}</td>
                    <td className="fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(v.total)}</td>
                    <td><Badge variant={v.estado === 'anulado' ? 'danger' : 'success'}>{v.estado}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {alertas.length > 0 && (
        <Card>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Alertas de Monitoreo</h5>
            <Badge variant="warning">{alertas.length} alertas</Badge>
          </div>
          <ul className="mb-0 ps-3 small text-muted">
            {alertas.slice(0, 5).map((a) => (
              <li key={a.id_alerta}>{a.mensaje} — {a.nivel}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
