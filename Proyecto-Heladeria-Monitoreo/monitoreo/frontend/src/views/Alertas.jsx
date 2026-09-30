import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, acusar, resolver, reenviar, crearPrueba } from '../services/alertasService';

export default function Alertas() {
  const { orgSeleccionada } = useAuth();
  const [nivel, setNivel] = useState('');
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nivel: 'critico', tipoRecurso: 'agua', mensaje: '' });
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

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

  const generarPrueba = async (e) => {
    e.preventDefault();
    if (!orgSeleccionada) { setError('Selecciona una organización'); return; }
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      await crearPrueba({ organizacionId: orgSeleccionada, ...form });
      setAviso('Alerta de prueba enviada a POS');
      setForm((f) => ({ ...f, mensaje: '' }));
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section>
      <h2>Alertas</h2>

      <form className="formulario" onSubmit={generarPrueba}>
        <label>Nivel
          <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
            <option value="alerta">Alerta</option>
            <option value="critico">Crítico</option>
          </select>
        </label>
        <label>Tipo
          <select value={form.tipoRecurso} onChange={(e) => setForm({ ...form, tipoRecurso: e.target.value })}>
            <option value="agua">Agua</option>
            <option value="energia">Energía</option>
          </select>
        </label>
        <label>Mensaje
          <input
            type="text"
            maxLength={500}
            value={form.mensaje}
            placeholder="Opcional: descripción de la alerta"
            onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
          />
        </label>
        <button type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Generar alerta de prueba'}</button>
      </form>

      {aviso && <p className="ok">{aviso}</p>}

      <form className="formulario">
        <label>Nivel
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">Todos</option>
            <option value="alerta">Alerta</option>
            <option value="critico">Critico</option>
          </select>
        </label>
      </form>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead>
          <tr><th>Fecha</th><th>Nivel</th><th>Tipo</th><th>Mensaje</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {data.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.fecha_generacion).toLocaleString('es')}</td>
              <td><span className={`badge ${a.nivel}`}>{(a.nivel ?? '').toUpperCase()}</span></td>
              <td>{a.tipo_recurso}</td>
              <td>{a.mensaje}</td>
              <td>{a.estado}</td>
              <td>
                <button type="button" onClick={() => acusar(a.id).then(cargar).catch((e) => setError(e.message))}>Acusar</button>{' '}
                <button type="button" onClick={() => resolver(a.id).then(cargar).catch((e) => setError(e.message))}>Resolver</button>{' '}
                <button type="button" onClick={() => reenviar(a.id).then(cargar).catch((e) => setError(e.message))}>Reenviar</button>
              </td>
            </tr>
          ))}
          {data.length === 0 && !error && <tr><td colSpan="6">Sin alertas</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
