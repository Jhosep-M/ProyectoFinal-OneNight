import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar } from '../services/consumoService';

const LIMIT = 25;

export default function Consumo() {
  const { orgSeleccionada } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ data: [], total: 0 });
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      setDatos(await listar({ organizacionId: orgSeleccionada, page: pagina, limit: LIMIT }));
    } catch (e) {
      setError(e.message);
    }
  }, [orgSeleccionada, pagina]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [orgSeleccionada]);

  const totalPaginas = Math.max(1, Math.ceil((datos.total ?? 0) / LIMIT));

  return (
    <section>
      <h2>Consumo registrado</h2>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead>
          <tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Unidad</th><th>Clasificación</th></tr>
        </thead>
        <tbody>
          {datos.data.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.fecha_consumo).toLocaleString('es')}</td>
              <td>{r.tipo_recurso}</td>
              <td>{Number(r.cantidad).toLocaleString('es')}</td>
              <td>{r.unidad_medida}</td>
              <td><span className={`badge ${r.clasificacion}`}>{r.clasificacion}</span></td>
            </tr>
          ))}
          {datos.data.length === 0 && !error && <tr><td colSpan="5">Sin registros</td></tr>}
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
