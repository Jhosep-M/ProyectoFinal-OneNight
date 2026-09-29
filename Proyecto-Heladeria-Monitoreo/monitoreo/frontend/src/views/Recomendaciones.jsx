import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear, actualizar } from '../services/recomendacionesService';

const vacio = { titulo: '', descripcion: '', prioridad: 'media' };

function mensajeError(err) {
  return Array.isArray(err.detail)
    ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
    : (err.detail ? `${err.message}: ${err.detail}` : err.message);
}

export default function Recomendaciones() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');

  const visibles = data.filter((r) => !filtroEstado || r.estado === filtroEstado);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      setData((await listar({ organizacionId: orgSeleccionada })).data);
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada]);

  useEffect(() => { cargar(); }, [cargar]);

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crear({
        organizacionId: orgSeleccionada,
        titulo: form.titulo,
        descripcion: form.descripcion,
        prioridad: form.prioridad,
      });
      setForm(vacio);
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(id, estado) {
    try {
      setError(null);
      await actualizar(id, { estado });
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  return (
    <section>
      <h2>Recomendaciones</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario" onSubmit={enviar}>
        <input placeholder="Título" value={form.titulo} required
          onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <textarea placeholder="Descripción" value={form.descripcion} required
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </select>
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear recomendación'}</button>
      </form>

      <form className="formulario">
        <label>Estado
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todas</option>
            <option value="abierta">Abiertas</option>
            <option value="aplicada">Aplicadas</option>
            <option value="descartada">Descartadas</option>
          </select>
        </label>
      </form>

      <table className="tabla">
        <thead>
          <tr><th>Título</th><th>Descripción</th><th>Prioridad</th><th>Estado</th><th /></tr>
        </thead>
        <tbody>
          {visibles.map((r) => (
            <tr key={r.id}>
              <td>{r.titulo}</td>
              <td>{r.descripcion}</td>
              <td><span className={`badge prioridad-${r.prioridad}`}>{(r.prioridad ?? '').toUpperCase()}</span></td>
              <td>{r.estado}</td>
              <td>
                {r.estado === 'abierta' && (
                  <>
                    <button type="button" onClick={() => cambiarEstado(r.id, 'aplicada')}>Aplicar</button>
                    {' '}
                    <button type="button" onClick={() => cambiarEstado(r.id, 'descartada')}>Descartar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {visibles.length === 0 && <tr><td colSpan="5">Sin recomendaciones</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
