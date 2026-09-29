import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear, actualizar, listarRecursos } from '../services/medidoresService';

const vacio = { codigoMedidor: '', nombre: '', tipoRecursoId: '' };

export default function Medidores() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  const visibles = data.filter((m) => !filtro || (m.tipoRecurso?.nombre ?? '').toLowerCase().includes(filtro));

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      setData((await listar({ organizacionId: orgSeleccionada })).data);
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    listarRecursos().then((r) => setRecursos(r.data)).catch(() => setRecursos([]));
  }, []);

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await actualizar(editando, { nombre: form.nombre });
        setEditando(null);
      } else {
        await crear({
          organizacionId: orgSeleccionada,
          codigoMedidor: form.codigoMedidor,
          nombre: form.nombre,
          tipoRecursoId: form.tipoRecursoId,
        });
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
      if (err.status === 409) {
        setError('Código medidor ya existe');
      } else {
        setError(err.detail ? `${err.message}: ${err.detail}` : err.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(m) {
    setEditando(m.id);
    setForm({ codigoMedidor: m.codigo_medidor, nombre: m.nombre, tipoRecursoId: '' });
    setError(null);
  }

  function cancelar() {
    setEditando(null);
    setForm(vacio);
    setError(null);
  }

  async function cambiarEstado(m) {
    try {
      setError(null);
      await actualizar(m.id, { estado: m.estado === 'activo' ? 'inactivo' : 'activo' });
      await cargar();
    } catch (e) { setError(e.message); }
  }

  return (
    <section>
      <h2>Puntos de medicion</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario">
        <label>Recurso
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="agua">Agua</option>
            <option value="energia">Energia</option>
          </select>
        </label>
      </form>
      <table className="tabla">
        <thead>
          <tr><th>Codigo</th><th>Nombre</th><th>Recurso</th><th>Estado</th><th /></tr>
        </thead>
        <tbody>
          {visibles.map((m) => (
            <tr key={m.id}>
              <td><code>{m.codigo_medidor}</code></td>
              <td>{m.nombre}</td>
              <td><span className={`badge ${(m.tipoRecurso?.nombre ?? '').toLowerCase().includes('agua') ? 'agua' : 'energia'}`}>{m.tipoRecurso?.nombre ?? '-'}</span></td>
              <td>{m.estado}</td>
              <td>
                <button type="button" onClick={() => empezarEdicion(m)}>Editar</button>{' '}
                <button type="button" onClick={() => cambiarEstado(m)}>
                  {m.estado === 'activo' ? 'Inactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
          {visibles.length === 0 && <tr><td colSpan="5">Sin medidores</td></tr>}
        </tbody>
      </table>

      <h2>{editando ? 'Editar medidor' : 'Nuevo medidor'}</h2>
      <form className="formulario" onSubmit={enviar}>
        <label>Codigo <input placeholder="MED-001" value={form.codigoMedidor} required disabled={!!editando}
          pattern="MED-.*"
          onChange={(e) => setForm({ ...form, codigoMedidor: e.target.value })} /></label>
        <label>Nombre <input placeholder="Nombre" value={form.nombre} required
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
        {!editando && (
          <label>Recurso
            <select value={form.tipoRecursoId} required
              onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
              <option value="">Seleccione...</option>
              {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </label>
        )}
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>{' '}
        {editando && <button type="button" onClick={cancelar}>Cancelar</button>}
      </form>
    </section>
  );
}
