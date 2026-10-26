import { useEffect, useState } from 'react';
import Card from '../../components/common/Card.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import { formatCurrency } from '../../utils/format.js';
import { listarVentas, listarMetodosPago } from '../../services/ventasService.js';

// HU-14 — Historial de ventas con filtros (fecha/estado/cajero/método).
// El backend aplica ownership: cajero ve solo su turno, admin todo.
// Montos con token numérico + tabular-nums (AGENTS §15.1).
const montoStyle = {
  fontFamily: 'var(--bs-font-numeric)',
  fontVariantNumeric: 'tabular-nums',
};

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', estado: '', cajero: '', metodo: '' });
  const [aplicados, setAplicados] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listarMetodosPago().catch(() => []).then((m) => setMetodos(m || []));
  }, []);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await listarVentas(aplicados);
        if (vivo) setVentas(data || []);
      } catch (e) {
        if (vivo) setError(e.message || 'No se pudo cargar el historial');
      } finally {
        if (vivo) setLoading(false);
      }
    };
    cargar();
    return () => { vivo = false; };
  }, [aplicados]);

  const aplicar = (e) => {
    e.preventDefault();
    setAplicados({ ...filtros });
  };

  const limpiar = () => {
    setFiltros({ desde: '', hasta: '', estado: '', cajero: '', metodo: '' });
    setAplicados({});
  };

  return (
    <div>
      <h1>Historial de ventas</h1>
      <p className="text-muted">Filtra por fecha, estado, cajero y método de pago.</p>
      {error && <Alert tone="error" message={error} />}

      <Card title="Filtros">
        <form onSubmit={aplicar}>
          <div className="filters-grid">
            <Input type="date" aria-label="Fecha desde" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
            <Input type="date" aria-label="Fecha hasta" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
            <Select aria-label="Estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
              <option value="">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="anulada">Anulada</option>
            </Select>
            <Input placeholder="Cajero (usuario_id)" aria-label="Cajero" value={filtros.cajero} onChange={(e) => setFiltros({ ...filtros, cajero: e.target.value })} />
            <Select aria-label="Método de pago" value={filtros.metodo} onChange={(e) => setFiltros({ ...filtros, metodo: e.target.value })}>
              <option value="">Todos los métodos</option>
              {metodos.map((m) => (
                <option key={m.id_metodo_pago || m.id} value={m.id_metodo_pago || m.id}>{m.nombre}</option>
              ))}
            </Select>
            <div className="d-flex gap-2">
              <Button type="submit">Filtrar</Button>
              <Button type="button" variant="secondary" onClick={limpiar}>Limpiar</Button>
            </div>
          </div>
        </form>
      </Card>

      <Card title={`Ventas (${ventas.length})`}>
        {loading ? (
          <div className="d-flex flex-column gap-2"><Skeleton height={36} /><Skeleton height={36} /></div>
        ) : ventas.length === 0 ? (
          <EmptyState title="Sin ventas" description="No hay ventas para los filtros aplicados." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Venta</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Turno</th></tr>
              </thead>
              <tbody>
                {ventas.map((v) => {
                  const id = v.id_venta || v.id;
                  return (
                    <tr key={id}>
                      <td><code>#{String(id).slice(0, 8)}</code></td>
                      <td>{v.fecha ? new Date(v.fecha).toLocaleString('es-BO') : '—'}</td>
                      <td style={montoStyle}>{v.total != null ? formatCurrency(v.total) : '—'}</td>
                      <td>
                        <Badge tone={(v.estado || 'activa') === 'activa' ? 'success' : 'neutral'}>
                          {v.estado || 'activa'}
                        </Badge>
                      </td>
                      <td><code>{v.turno_id ? String(v.turno_id).slice(0, 8) : '—'}</code></td>
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
