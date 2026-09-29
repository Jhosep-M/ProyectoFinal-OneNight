import { useEffect, useState } from 'react';
import { listarAuditoria } from '../../services/auditService.js';
import Card from '../../components/common/Card.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const PAGE_SIZE = 20;

export default function AuditoriaPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ accion: '', entidad: '', desde: '', hasta: '' });
  const [aplicados, setAplicados] = useState({});
  const [error, setError] = useState('');

  const cargar = async (f, p) => {
    setLoading(true);
    try {
      const r = await listarAuditoria({ ...f, limit: PAGE_SIZE, offset: p * PAGE_SIZE });
      setData(r.data || []);
      setTotal(r.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(aplicados, page); }, [aplicados, page]);

  const aplicar = (e) => {
    e.preventDefault();
    setPage(0);
    setAplicados(filtros);
  };

  const paginas = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1>Auditoría</h1>
      {error && <Alert tone="error" message={error} />}

      <Card>
        <form onSubmit={aplicar}>
          <div className="filters-grid">
            <Input placeholder="acción (ej. venta.crear)" value={filtros.accion} onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })} />
            <Input placeholder="entidad (ej. venta)" value={filtros.entidad} onChange={(e) => setFiltros({ ...filtros, entidad: e.target.value })} />
            <Input type="datetime-local" aria-label="Desde" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
            <Input type="datetime-local" aria-label="Hasta" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
            <Button type="submit">Filtrar</Button>
          </div>
        </form>
      </Card>

      <Card title={`Acciones (${total})`}>
        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : data.length === 0 ? (
          <EmptyState
            title="Sin acciones"
            description="No hay registros para los filtros aplicados."
          />
        ) : (
          <>
            <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Resultado</th></tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id_auditoria}>
                    <td>{new Date(a.fecha).toLocaleString()}</td>
                    <td>{a.usuario_id}</td>
                    <td>{a.accion}</td>
                    <td>{a.entidad}</td>
                    <td>{a.resultado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="pager">
              {paginas > 1 && (
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>← Anterior</Button>
              )}
              <span>Página {page + 1} de {paginas || 1}</span>
              {paginas > 1 && (
                <Button size="sm" variant="ghost" disabled={page + 1 >= paginas} onClick={() => setPage(page + 1)}>Siguiente →</Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
