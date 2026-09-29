import { useCallback, useEffect, useState } from 'react';
import { listar, marcarVista } from '../services/notificacionesService';

export default function Notificaciones() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try { setError(null); setData((await listar()).data); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function ver(id) {
    try { await marcarVista(id); await cargar(); }
    catch (e) { setError(e.message); }
  }

  return (
    <section>
      <h2>Notificaciones</h2>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead><tr><th>Creada</th><th>Estado</th><th>Alerta</th><th /></tr></thead>
        <tbody>
          {data.map((n) => (
            <tr key={n.id}>
              <td>{new Date(n.creada_en).toLocaleString('es')}</td>
              <td>{n.estado}</td>
              <td>{n.alerta?.mensaje}</td>
              <td>
                {n.estado === 'pendiente' && (
                  <button type="button" onClick={() => ver(n.id)}>Marcar vista</button>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="4">Sin notificaciones</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
