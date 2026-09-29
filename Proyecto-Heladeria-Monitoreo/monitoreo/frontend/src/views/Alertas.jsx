import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar } from '../services/alertasService';

export default function Alertas() {
  const { orgSeleccionada } = useAuth();
  const [nivel, setNivel] = useState('');
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      const r = await listar({ organizacionId: orgSeleccionada, nivel: nivel || undefined });
      setData(r.data);
    } catch (e) {
      setError(e.message);
    }
  }, [orgSeleccionada, nivel]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <section>
      <h2>Alertas</h2>
      <form className="formulario">
        <label>Nivel
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">Todos</option>
            <option value="normal">Normal</option>
            <option value="advertencia">Advertencia</option>
            <option value="alerta">Alerta</option>
            <option value="critico">Critico</option>
          </select>
        </label>
      </form>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead>
          <tr><th>Fecha</th><th>Nivel</th><th>Tipo</th><th>Mensaje</th><th>Entrega al POS</th></tr>
        </thead>
        <tbody>
          {data.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.fecha_generacion).toLocaleString('es')}</td>
              <td><span className={`badge ${a.nivel}`}>{(a.nivel ?? '').toUpperCase()}</span></td>
              <td>{a.tipo_recurso}</td>
              <td>{a.mensaje}</td>
              <td>{a.estado}</td>
            </tr>
          ))}
          {data.length === 0 && !error && <tr><td colSpan="5">Sin alertas</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
