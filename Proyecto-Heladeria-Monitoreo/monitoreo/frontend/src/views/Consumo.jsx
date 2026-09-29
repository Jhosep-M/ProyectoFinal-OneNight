import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar } from '../services/consumoService';

const LIMIT = 25;

export default function Consumo() {
  const { orgSeleccionada } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ data: [], total: 0 });
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [recurso, setRecurso] = useState('');
  const [sel, setSel] = useState(null);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    if (desde && hasta && desde > hasta) {
      setError('Rango de fechas invalido');
      return;
    }
    try {
      setError(null);
      setAviso(null);
      setCargando(true);
      setDatos(await listar({ organizacionId: orgSeleccionada, page: pagina, limit: LIMIT, desde: desde || undefined, hasta: hasta || undefined, recurso: recurso || undefined }));
    } catch (e) {
      if (e.status === 409) {
        setAviso('Ya procesado, no duplicado');
      } else {
        setError(e.message);
      }
    } finally {
      setCargando(false);
    }
  }, [orgSeleccionada, pagina, desde, hasta, recurso]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [orgSeleccionada]);

  const totalPaginas = Math.max(1, Math.ceil((datos.total ?? 0) / LIMIT));

  return (
    <section>
      <h2>Consumo registrado ({datos.total ?? 0})</h2>
      <form className="formulario" onSubmit={(e) => { e.preventDefault(); setPagina(1); cargar(); }}>
        <label>Desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label>Hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
        <label>Recurso
          <select value={recurso} onChange={(e) => { setRecurso(e.target.value); setPagina(1); }}>
            <option value="">Todos</option>
            <option value="agua">Agua</option>
            <option value="energia">Energia</option>
          </select>
        </label>
        <button type="submit">Filtrar</button>
      </form>
      {error && <p className="error">{error}</p>}
      {aviso && <p className="toast">{aviso}</p>}
      {cargando && <p className="cargando">Cargando...</p>}
      <table className="tabla">
        <thead>
          <tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Unidad</th><th>Clasificacion</th></tr>
        </thead>
        <tbody>
          {datos.data.map((r) => (
            <tr key={r.id} onClick={() => setSel(r)} style={{ cursor: 'pointer' }}>
              <td>{new Date(r.fecha_consumo).toLocaleString('es')}</td>
              <td><span className={`badge ${r.tipo_recurso === 'agua' ? 'agua' : 'energia'}`}>{r.tipo_recurso === 'agua' ? 'AGUA' : 'ENERGÍA'}</span></td>
              <td className="num">{r.cantidad == null ? '-' : Number(r.cantidad).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>{r.unidad_medida}</td>
              <td><span className={`badge ${r.clasificacion}`}>{r.clasificacion ?? '-'}</span></td>
            </tr>
          ))}
          {datos.data.length === 0 && !error && !cargando && <tr><td colSpan="5">Sin registros</td></tr>}
        </tbody>
      </table>
      <div className="paginacion">
        <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span>Pagina {pagina} de {totalPaginas}</span>
        <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
      </div>
      {sel && (
        <div className="detalle">
          <h3>Detalle del registro</h3>
          <dl>
            <div><dt>Tipo</dt><dd>{sel.tipo_recurso} - {sel.cantidad == null ? '-' : Number(sel.cantidad).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {sel.unidad_medida}</dd></div>
            <div><dt>Fecha</dt><dd>{sel.fecha_consumo ? new Date(sel.fecha_consumo).toLocaleString('es') : '-'}</dd></div>
            <div><dt>ID externo</dt><dd><code>{sel.consumoExternoId ?? sel.consumo_externo_id ?? '-'}</code></dd></div>
            <div><dt>Idempotency key</dt><dd><code>{sel.idempotencyKey ?? sel.idempotency_key ?? '-'}</code></dd></div>
            <div><dt>Organización externa</dt><dd><code>{sel.organizacionExternaId ?? sel.organizacion_externa_id ?? '-'}</code></dd></div>
            <div><dt>Origen</dt><dd>{sel.origen ?? '-'}</dd></div>
            <div><dt>Estado</dt><dd>{sel.estado ?? '-'}</dd></div>
          </dl>
          <button type="button" onClick={() => setSel(null)}>Cerrar</button>
        </div>
      )}
    </section>
  );
}
