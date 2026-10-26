import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { formatCurrency, formatTime } from '../../../utils/format.js';
import { listarVentas } from '../../../services/ventasService.js';
import { listarMesas } from '../../../services/mesasService.js';
import { listarPedidos } from '../../../services/pedidosService.js';
import { listarTodosTurnos } from '../../../services/cajaService.js';
import { listarAlertasMonitoreo } from '../../../services/alertasService.js';
import { listarCola, listarColaPendiente } from '../../../services/integracionService.js';
import { listarAuditoria } from '../../../services/auditService.js';
import { inventarioService } from '../../../services/inventarioService.js';
import { getAlertaInsumo } from '../../../utils/inventario.js';

const normVenta = (v) => ({
  ...v,
  id: v.id_venta || v.id,
  total: Number(v.total) || 0,
  estado: v.estado === 'anulada' ? 'anulado' : v.estado === 'activa' ? 'completado' : v.estado,
});

function esHoy(fecha) {
  if (!fecha) return false;
  const d = new Date(fecha);
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

function esAyer(fecha) {
  if (!fecha) return false;
  const d = new Date(fecha);
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return d.getFullYear() === ayer.getFullYear() && d.getMonth() === ayer.getMonth() && d.getDate() === ayer.getDate();
}

export default function AdminDashboard() {
  const [ventas, setVentas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [cola, setCola] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    const [vta, mes, ped, tur, ale, col, aud, ins] = await Promise.all([
      listarVentas().catch(() => []),
      listarMesas().catch(() => []),
      listarPedidos().catch(() => []),
      listarTodosTurnos().catch(() => []),
      listarAlertasMonitoreo({ limit: 10 }).catch(() => ({ data: [] })),
      listarCola({ limit: 20 }).catch(() => []),
      listarAuditoria({ limit: 10 }).catch(() => []),
      inventarioService.insumos().catch(() => []),
    ]);
    setVentas((vta || []).map(normVenta));
    setMesas(mes || []);
    setPedidos(ped || []);
    setTurnos(Array.isArray(tur) ? tur : []);
    setAlertas(ale?.data || []);
    // /integrations puede devolver array o { data } según filtro.
    setCola(Array.isArray(col) ? col : col?.data || []);
    setAuditoria(Array.isArray(aud) ? aud : aud?.data || aud?.rows || []);
    setInsumos(ins || []);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        setLoading(true);
        await recargar();
        if (activo) setError(null);
      } catch {
        if (activo) setError('No se pudo cargar el panel de administración');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    const id = setInterval(() => { recargar().catch(() => {}); }, 15000);
    const onFocus = () => { recargar().catch(() => {}); };
    window.addEventListener('focus', onFocus);
    return () => { activo = false; clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [recargar]);

  const stats = useMemo(() => {
    const hoy = ventas.filter((v) => esHoy(v.fecha || v.created_at));
    const ayer = ventas.filter((v) => esAyer(v.fecha || v.created_at));
    const validasHoy = hoy.filter((v) => v.estado !== 'anulado');
    const totalHoy = validasHoy.reduce((s, v) => s + (v.total || 0), 0);
    const totalAyer = ayer.filter((v) => v.estado !== 'anulado').reduce((s, v) => s + (v.total || 0), 0);
    const anuladas = hoy.filter((v) => v.estado === 'anulado').length;
    const delta = totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer) * 100 : null;
    // Ventas por hora (0-23) para mini gráfico.
    const porHora = Array.from({ length: 24 }, () => 0);
    validasHoy.forEach((v) => {
      const d = new Date(v.fecha || v.created_at);
      if (!Number.isNaN(d.getTime())) porHora[d.getHours()] += (v.total || 0);
    });
    const maxHora = Math.max(1, ...porHora);
    return { hoy, ayer, validasHoy, totalHoy, totalAyer, anuladas, delta, porHora, maxHora };
  }, [ventas]);

  if (loading) {
    return (
      <div className="d-flex flex-column gap-3">
        <div className="row g-3">{[1, 2, 3, 4].map((i) => (<div key={i} className="col-12 col-md-6 col-xl-3"><Skeleton height="90px" /></div>))}</div>
        <Skeleton height="160px" /><Skeleton height="240px" /><Skeleton height="240px" />
      </div>
    );
  }
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  const ocupadas = mesas.filter((m) => m.estado === 'ocupada').length;
  const abiertos = turnos.filter((t) => t.estado === 'abierto');
  const cocina = pedidos.filter((p) => ['abierto', 'pendiente', 'en_preparacion', 'listo'].includes(p.estado));
  const criticos = insumos.filter((i) => getAlertaInsumo(i));
  // Cola: tolera forma array u objeto con estado.
  const pendientes = cola.filter((c) => (c.estado || c.status) === 'pendiente' || (c.estado || c.status) === 'fallido' || !c.estado);
  const colaFallida = cola.filter((c) => (c.estado || c.status) === 'fallido' || (c.estado || c.status) === 'error').length;
  void listarColaPendiente;

  const metricas = [
    { titulo: 'Ventas hoy', valor: formatCurrency(stats.totalHoy), icono: 'bi-cash-stack', color: 'success', sub: `${stats.validasHoy.length} ventas · ${stats.anuladas} anuladas` },
    { titulo: 'Ticket promedio', valor: stats.validasHoy.length ? formatCurrency(stats.totalHoy / stats.validasHoy.length) : formatCurrency(0), icono: 'bi-receipt', color: 'primary', sub: stats.delta == null ? 'sin comparativa ayer' : `${stats.delta >= 0 ? '+' : ''}${stats.delta.toFixed(1)}% vs ayer (${formatCurrency(stats.totalAyer)})` },
    { titulo: 'Turnos abiertos', valor: `${abiertos.length}/${turnos.length}`, icono: 'bi-clock-history', color: 'warning', sub: `${ocupadas}/${mesas.length} mesas ocupadas` },
    { titulo: 'Riesgos', valor: String(alertas.length + colaFallida + criticos.length), icono: 'bi-shield-exclamation', color: 'danger', sub: `${alertas.length} alertas · ${colaFallida} cola fallida · ${criticos.length} insumos alerta` },
  ];

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-1" style={{ fontFamily: 'var(--bs-font-serif)' }}>Administración — visión global</h5>
          <p className="text-muted small mb-0">Ventas, caja, operación, inventario, integración y auditoría en un solo panel.</p>
        </div>
      </div>

      <div className="row g-3">
        {metricas.map((m) => (
          <div key={m.titulo} className="col-12 col-md-6 col-xl-3">
            <Card className="h-100">
              <div className="d-flex align-items-center">
                <div className={`rounded-circle bg-soft-${m.color} p-3 me-3`}><i className={`bi ${m.icono} text-${m.color} fs-5`}></i></div>
                <div>
                  <div className="text-muted small text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>{m.titulo}</div>
                  <div className="fw-bold fs-4" style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{m.valor}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{m.sub}</div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <Card>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Ventas por hora (hoy)</h5>
              <Badge variant="secondary">{stats.validasHoy.length} ventas</Badge>
            </div>
            <div className="d-flex align-items-end gap-1" style={{ height: '110px' }} role="img" aria-label="Ventas por hora">
              {stats.porHora.map((v, h) => (
                <div
                  key={h}
                  title={`${h}:00 — ${formatCurrency(v)}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, (v / stats.maxHora) * 100)}%`,
                    background: v > 0 ? 'var(--bs-primary)' : 'var(--bs-tertiary-bg)',
                    borderRadius: '4px',
                    opacity: v > 0 ? 0.9 : 1,
                  }}
                />
              ))}
            </div>
            <div className="d-flex justify-content-between text-muted small mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
            </div>
          </Card>
        </div>
        <div className="col-12 col-xl-5">
          <Card>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Operación en vivo</h5>
              <Badge variant={cocina.length ? 'warning' : 'secondary'}>{cocina.length} en cocina</Badge>
            </div>
            <ul className="mb-3 ps-3 small">
              <li>Turnos abiertos: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{abiertos.length}</strong> {abiertos.slice(0, 3).map((t) => t.cajero_email || t.cajero).filter(Boolean).join(', ') && `(${abiertos.slice(0, 3).map((t) => t.cajero_email || t.cajero).join(', ')})`}</li>
              <li>Mesas: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{ocupadas}/{mesas.length}</strong> ocupadas</li>
              <li>Pedidos activos: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{cocina.length}</strong></li>
            </ul>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/cocina" className="btn btn-sm btn-outline-primary">Cocina</Link>
              <Link to="/mesas" className="btn btn-sm btn-outline-primary">Mesas</Link>
              <Link to="/pedidos" className="btn btn-sm btn-outline-primary">Pedidos</Link>
              <Link to="/ventas/historial" className="btn btn-sm btn-outline-primary">Historial ventas</Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <Card>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Integración POS → Monitoreo</h5>
              <Badge variant={colaFallida ? 'danger' : pendientes.length ? 'warning' : 'secondary'}>{pendientes.length} en cola</Badge>
            </div>
            {pendientes.length === 0 ? (
              <EmptyState icon="bi-check-circle" title="Cola al día" description="Sin eventos pendientes hacia Monitoreo." />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead><tr><th>Tipo</th><th>Estado</th><th>Intentos</th><th>Acción</th></tr></thead>
                  <tbody>
                    {pendientes.slice(0, 6).map((c, idx) => (
                      <tr key={c.id_cola || c.id || idx}>
                        <td className="small">{c.tipo_evento || c.tipo || 'consumo'}</td>
                        <td><Badge variant={(c.estado === 'fallido' || c.estado === 'error') ? 'danger' : 'warning'}>{c.estado || c.status || 'pendiente'}</Badge></td>
                        <td className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.intentos ?? 0}</td>
                        <td><Link to="/integracion" className="btn btn-sm btn-outline-secondary">Reintentar</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-2"><Link to="/integracion" className="small">Ver cola completa →</Link></div>
          </Card>
        </div>
        <div className="col-12 col-xl-6">
          <Card>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Alertas de Monitoreo</h5>
              <Badge variant={alertas.length ? 'warning' : 'secondary'}>{alertas.length} alertas</Badge>
            </div>
            {alertas.length === 0 ? (
              <EmptyState icon="bi-bell-slash" title="Sin alertas" description="Cuando Monitoreo detecte exceso aparecerá aquí." />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead><tr><th>Hora</th><th>Nivel</th><th>Mensaje</th></tr></thead>
                  <tbody>
                    {alertas.slice(0, 6).map((a) => (
                      <tr key={a.id_alerta}>
                        <td className="text-muted small">{formatTime(a.creado_en)}</td>
                        <td><Badge variant={a.nivel === 'critico' ? 'danger' : a.nivel === 'medio' ? 'warning' : 'info'}>{a.nivel}</Badge></td>
                        <td className="small">{a.mensaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <Card>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Inventario crítico</h5>
              <Badge variant={criticos.length ? 'danger' : 'secondary'}>{criticos.length} con alerta</Badge>
            </div>
            {criticos.length === 0 ? (
              <p className="text-muted small mb-0">Inventario sano.</p>
            ) : (
              <ul className="mb-0 ps-3 small">
                {criticos.slice(0, 6).map((i) => (
                  <li key={i.id_insumo}>{i.nombre} — {i.stock} {i.unidad_medida || ''} ({getAlertaInsumo(i)})</li>
                ))}
              </ul>
            )}
            <div className="mt-2"><Link to="/catalogo/inventario" className="small">Gestionar inventario →</Link></div>
          </Card>
        </div>
        <div className="col-12 col-xl-6">
          <Card>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Auditoría reciente</h5>
              <Badge variant="secondary">{auditoria.length} eventos</Badge>
            </div>
            {auditoria.length === 0 ? (
              <p className="text-muted small mb-0">Sin eventos auditados en el rango.</p>
            ) : (
              <ul className="mb-0 ps-3 small text-muted">
                {auditoria.slice(0, 6).map((a, idx) => (
                  <li key={a.id_auditoria || a.id || idx}>{a.accion || a.evento} · {a.entidad || a.tabla || ''} · {formatTime(a.creado_en || a.fecha || a.created_at)}</li>
                ))}
              </ul>
            )}
            <div className="mt-2"><Link to="/auditoria" className="small">Ver auditoría →</Link></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
