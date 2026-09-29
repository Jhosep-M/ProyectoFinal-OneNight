import { useCallback, useEffect, useState } from 'react';
import { listar, marcarVista } from '../services/notificacionesService';

export default function Notificaciones() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [soloPendientes, setSoloPendientes] = useState(false);

  const cargar = useCallback(async () => {
    try { setError(null); setData((await listar()).data); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function ver(id) {
    try { await marcarVista(id); await cargar(); }
    catch (e) { setError(e.message); }
  }

  async function verTodas() {
    try {
      setError(null);
      const pendientes = data.filter((n) => n.estado === 'pendiente');
      await Promise.all(pendientes.map((n) => marcarVista(n.id)));
      await cargar();
    } catch (e) { setError(e.message); }
  }

  const pendientes = data.filter((n) => n.estado === 'pendiente').length;
  const visibles = soloPendientes ? data.filter((n) => n.estado === 'pendiente') : data;

  return (
    <section>
      <h2>Notificaciones {pendientes > 0 && <span className="badge prioridad-alta">{pendientes} pendientes</span>}</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario">
        <label>
          <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
          {' '}Solo pendientes
        </label>
        {pendientes > 0 && <button type="button" onClick={verTodas}>Marcar todas como vistas</button>}
      </form>
      <table className="tabla">
        <thead><tr><th>Fecha</th><th>Estado</th><th>Mensaje</th><th>Accion</th></tr></thead>
        <tbody>
          {visibles.map((n) => (
            <tr key={n.id}>
              <td>{new Date(n.creada_en).toLocaleString('es')}</td>
              <td>{n.estado}</td>
              <td>{n.alerta?.mensaje ?? '-'}</td>
              <td>
                {n.estado === 'pendiente' && (
                  <button type="button" onClick={() => ver(n.id)}>Marcar vista</button>
                )}
              </td>
            </tr>
          ))}
          {visibles.length === 0 && <tr><td colSpan="4">Sin notificaciones</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
