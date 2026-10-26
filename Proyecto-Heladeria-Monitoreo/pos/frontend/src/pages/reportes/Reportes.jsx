import { useEffect, useState } from 'react';
import Card from '../../components/common/Card.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import { formatCurrency } from '../../utils/format.js';
import { listarVentas } from '../../services/ventasService.js';
import { listarAuditoria } from '../../services/auditService.js';
import { apiFetch, supabase, BASE } from '../../services/api.js';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';

// HU-10 — Reportes: cierre exportable del día/rango.
// Agregados del backend (GET /reports/cierre) + lista de ventas +
// actividad auditada. Exportar CSV con Blob, sin librerías nuevas.
// Montos con token numérico + tabular-nums (AGENTS §15.1).
const montoStyle = {
  fontFamily: 'var(--bs-font-numeric)',
  fontVariantNumeric: 'tabular-nums',
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

export const obtenerCierre = ({ desde, hasta } = {}) => {
  const qs = new URLSearchParams(
    Object.entries({ desde, hasta }).filter(([, v]) => v)
  ).toString();
  return apiFetch(`/reports/cierre${qs ? `?${qs}` : ''}`);
};

// HU-25 — Descarga CSV del servidor (GET /reports/export, solo admin/supervisor).
// Requiere permiso turno.consultar.todos; el backend audita reporte.exportar.
export const descargarExportacion = async ({ desde, hasta } = {}) => {
  const qs = new URLSearchParams(
    Object.entries({ desde, hasta, formato: 'csv' }).filter(([, v]) => v)
  ).toString();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${BASE}/reports/export${qs ? `?${qs}` : ''}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let msg = 'No se pudo exportar el reporte';
    try {
      const payload = await res.clone().json();
      if (payload?.error) msg = payload.error;
    } catch { /* cuerpo no-JSON (csv fallido): mensaje genérico */ }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cierre-${desde || 'todos'}_${hasta || 'todos'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

function aCSV(cierre, ventas) {
  const filas = ['seccion,clave,cantidad,total'];
  (cierre.porMetodo || []).forEach((m) =>
    filas.push(`metodo,"${m.metodo}",${m.pagos},${m.total}`)
  );
  (cierre.topProductos || []).forEach((p) =>
    filas.push(`producto,"${p.producto}",${p.cantidad},${p.total}`)
  );
  (cierre.porTurno || []).forEach((t) =>
    filas.push(`turno,${t.turno_id},${t.ventas},${t.total}`)
  );
  filas.push('');
  filas.push('venta,fecha,total,estado');
  (ventas || []).forEach((v) =>
    filas.push(`${v.id_venta || v.id},${v.fecha || ''},${v.total ?? ''},${v.estado || ''}`)
  );
  return filas.join('\n');
}

export default function Reportes() {
  const [rango, setRango] = useState({ desde: hoyISO(), hasta: hoyISO() });
  const [aplicado, setAplicado] = useState({ desde: hoyISO(), hasta: hoyISO() });
  const [cierre, setCierre] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [auditoriaTotal, setAuditoriaTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      setLoading(true);
      setError('');
      try {
        const [c, v, a] = await Promise.all([
          obtenerCierre(aplicado),
          listarVentas({ desde: aplicado.desde, hasta: aplicado.hasta }),
          listarAuditoria({ desde: aplicado.desde, hasta: aplicado.hasta, limit: 1 }).catch(() => ({ total: 0 })),
        ]);
        if (!vivo) return;
        setCierre(c);
        setVentas(v || []);
        setAuditoriaTotal(a?.total || 0);
      } catch (e) {
        if (vivo) setError(e.message || 'No se pudo cargar el reporte');
      } finally {
        if (vivo) setLoading(false);
      }
    };
    cargar();
    return () => { vivo = false; };
  }, [aplicado]);

  const aplicar = (e) => {
    e.preventDefault();
    setAplicado({ ...rango });
  };

  const exportar = async () => {
    setError('');
    setExportando(true);
    try {
      // HU-25: descarga auditada del servidor para admin/supervisor.
      await descargarExportacion(aplicado);
    } catch (e) {
      // Fallback local: Blob con los datos ya cargados (sin auditoría servidor).
      try {
        const csv = aCSV(cierre || {}, ventas);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cierre-${aplicado.desde || 'todos'}_${aplicado.hasta || 'todos'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        setError(e.message || 'No se pudo exportar el reporte');
      }
    } finally {
      setExportando(false);
    }
  };

  return (
    <div>
      <h1>Reportes</h1>
      <p className="text-muted">Cierre exportable: totales por método, top productos y ventas por turno.</p>
      {error && <Alert tone="error" message={error} />}

      <Card title="Rango">
        <form onSubmit={aplicar}>
          <div className="filters-grid">
            <Input type="date" aria-label="Fecha desde" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
            <Input type="date" aria-label="Fecha hasta" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
            <div className="d-flex gap-2">
              <Button type="submit">Ver cierre</Button>
              <RequirePermiso permiso="turno.consultar.todos" fallback={null}>
                <Button type="button" variant="secondary" onClick={exportar} disabled={loading || exportando || !cierre}>
                  {exportando ? 'Exportando...' : 'Exportar CSV'}
                </Button>
              </RequirePermiso>
            </div>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="d-flex flex-column gap-2"><Skeleton height={36} /><Skeleton height={120} /></div>
      ) : !cierre ? (
        <EmptyState title="Sin datos" description="No se pudo cargar el cierre." />
      ) : (
        <div className="d-flex flex-column gap-3">
          <Card title="Resumen">
            <div className="d-flex gap-3 flex-wrap">
              <div><span className="text-muted">Ventas: </span><strong style={montoStyle}>{cierre.totalVentas}</strong></div>
              <div><span className="text-muted">Monto total: </span><strong style={montoStyle}>{formatCurrency(cierre.montoTotal || 0)}</strong></div>
              <div><span className="text-muted">Acciones auditadas: </span><Badge tone="info">{auditoriaTotal}</Badge></div>
            </div>
          </Card>

          <Card title="Totales por método de pago">
            {(cierre.porMetodo || []).length === 0 ? (
              <EmptyState title="Sin pagos" description="No hay pagos en el rango." />
            ) : (
              <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Método</th><th>Pagos</th><th>Total</th></tr></thead>
                <tbody>
                  {(cierre.porMetodo || []).map((m) => (
                    <tr key={m.metodo}>
                      <td>{m.metodo}</td>
                      <td style={montoStyle}>{m.pagos}</td>
                      <td style={montoStyle}>{formatCurrency(m.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Card>

          <Card title="Top productos">
            {(cierre.topProductos || []).length === 0 ? (
              <EmptyState title="Sin productos" description="No hay ventas de productos en el rango." />
            ) : (
              <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Total</th></tr></thead>
                <tbody>
                  {(cierre.topProductos || []).map((p) => (
                    <tr key={p.producto_id}>
                      <td>{p.producto}</td>
                      <td style={montoStyle}>{p.cantidad}</td>
                      <td style={montoStyle}>{formatCurrency(p.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Card>

          <Card title={`Ventas por turno (${(cierre.porTurno || []).length})`}>
            {(cierre.porTurno || []).length === 0 ? (
              <EmptyState title="Sin turnos" description="No hay ventas por turno en el rango." />
            ) : (
              <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Turno</th><th>Ventas</th><th>Total</th></tr></thead>
                <tbody>
                  {(cierre.porTurno || []).map((t) => (
                    <tr key={t.turno_id}>
                      <td><code>#{String(t.turno_id).slice(0, 8)}</code></td>
                      <td style={montoStyle}>{t.ventas}</td>
                      <td style={montoStyle}>{formatCurrency(t.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
