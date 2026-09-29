import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar } from '../services/auditoriaService';

const LIMIT = 25;

function celdaDetalle(valor) {
  if (valor === null || valor === undefined) return '-';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

export default function Auditoria() {
  const { orgSeleccionada } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [datos, setDatos] = useState({ data: [], total: 0 });
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    setCargando(true);
    setError(null);
    try {
      setDatos(await listar({
        organizacionId: orgSeleccionada,
        page: pagina,
        limit: LIMIT,
        desde: rango.desde || undefined,
        hasta: rango.hasta || undefined,
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [orgSeleccionada, pagina, rango]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [orgSeleccionada, rango]);

  const totalPaginas = Math.max(1, Math.ceil((datos.total ?? 0) / LIMIT));

  return (
    <section>
      <h2>Auditoría ({datos.total ?? 0})</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario" onSubmit={(e) => e.preventDefault()}>
        <label>Desde <input type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} /></label>
        <label>Hasta <input type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} /></label>
        {(rango.desde || rango.hasta) && (
          <button type="button" onClick={() => setRango({ desde: '', hasta: '' })}>Limpiar</button>
        )}
      </form>
      {datos.pendienteBackend && <p className="toast">Endpoint de auditoría pendiente en backend. Vista lista, solo lectura.</p>}
      {cargando && <p className="cargando">Cargando...</p>}
      <table className="tabla">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
        <tbody>
          {(datos.data ?? []).map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at ?? r.fecha ?? r.createdAt ?? r.creado_en).toLocaleString('es')}</td>
              <td>{r.usuario ?? r.user_email ?? '-'}</td>
              <td>{r.accion ?? r.action ?? '-'}</td>
              <td className="mono">{celdaDetalle(r.detalle ?? r.detail)}</td>
            </tr>
          ))}
          {(datos.data ?? []).length === 0 && !cargando && !error && <tr><td colSpan="4">Sin registros</td></tr>}
        </tbody>
      </table>
      <div className="paginacion">
        <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>‹</button>
        <span>Página {pagina} de {totalPaginas} ({datos.total ?? 0} registros)</span>
        <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>›</button>
      </div>
    </section>
  );
}
