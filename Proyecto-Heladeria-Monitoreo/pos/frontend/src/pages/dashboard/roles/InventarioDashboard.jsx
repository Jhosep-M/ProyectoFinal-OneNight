import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { inventarioService } from '../../../services/inventarioService.js';
import { getAlertaInsumo } from '../../../utils/inventario.js';

export default function InventarioDashboard() {
  const [insumos, setInsumos] = useState([]);
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    const [ins, mv] = await Promise.all([
      inventarioService.insumos().catch(() => []),
      inventarioService.movimientos().catch(() => []),
    ]);
    setInsumos(ins || []);
    setMovs(mv || []);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        setLoading(true);
        await recargar();
        if (activo) setError(null);
      } catch {
        if (activo) setError('No se pudo cargar tu panel de inventario');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [recargar]);

  if (loading) return <div className="d-flex flex-column gap-3"><Skeleton height="120px" /><Skeleton height="220px" /></div>;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  const conAlerta = insumos.filter((i) => getAlertaInsumo(i));
  const stockBajo = insumos.filter((i) => getAlertaInsumo(i) === 'stock-bajo').length;
  const vencidos = insumos.filter((i) => getAlertaInsumo(i) === 'vencido').length;
  const porVencer = insumos.filter((i) => getAlertaInsumo(i) === 'por-vencer').length;
  const criticos = [...conAlerta].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre))).slice(0, 8);
  const movsRecientes = [...movs].slice(0, 8);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 className="mb-1" style={{ fontFamily: 'var(--bs-font-serif)' }}>Inventario — estado crítico</h5>
          <p className="text-muted small mb-0">{conAlerta.length} insumos con alerta · stock y vencimientos.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/catalogo/inventario" className="btn btn-primary btn-sm"><i className="bi bi-boxes me-1"></i>Gestionar inventario</Link>
          <Link to="/catalogo/recetas" className="btn btn-outline-secondary btn-sm">Ver recetas</Link>
        </div>
      </div>

      <div className="row g-3">
        {[
          { titulo: 'Stock bajo', valor: String(stockBajo), icono: 'bi-exclamation-triangle', color: 'warning' },
          { titulo: 'Vencidos', valor: String(vencidos), icono: 'bi-x-circle', color: 'danger' },
          { titulo: 'Por vencer', valor: String(porVencer), icono: 'bi-alarm', color: 'info' },
          { titulo: 'Total insumos', valor: String(insumos.length), icono: 'bi-box', color: 'primary' },
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
          <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Requieren atención</h5>
          <Badge variant={criticos.length ? 'warning' : 'secondary'}>{criticos.length} insumos</Badge>
        </div>
        {criticos.length === 0 ? (
          <EmptyState icon="bi-check-circle" title="Inventario sano" description="Ningún insumo bajo mínimo ni vencido." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr><th>Insumo</th><th>Stock</th><th>Mín</th><th>Alerta</th><th>Acción</th></tr></thead>
              <tbody>
                {criticos.map((i) => (
                  <tr key={i.id_insumo}>
                    <td className="fw-semibold">{i.nombre}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{i.stock} {i.unidad_medida || ''}</td>
                    <td className="text-muted">{i.stock_minimo ?? 0}</td>
                    <td><Badge variant={getAlertaInsumo(i) === 'vencido' ? 'danger' : 'warning'}>{getAlertaInsumo(i)}</Badge></td>
                    <td><Link to="/catalogo/inventario" className="btn btn-sm btn-outline-primary">Reponer</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>Movimientos recientes</h5>
          <Badge variant="secondary">{movs.length} total</Badge>
        </div>
        {movsRecientes.length === 0 ? (
          <p className="text-muted small mb-0">Sin movimientos registrados.</p>
        ) : (
          <ul className="mb-0 ps-3 small text-muted">
            {movsRecientes.map((m) => (
              <li key={m.id_movimiento}>{m.tipo} · {m.cantidad} · {m.motivo || 'sin motivo'}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
