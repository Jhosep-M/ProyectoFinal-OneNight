import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear, actualizar } from '../services/umbralService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { nombre: '', tipoRecursoId: '', nivel: 'normal', limiteInferior: '', limiteSuperior: '' };

export default function Umbrales() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filtroNivel, setFiltroNivel] = useState('');

  const visibles = data.filter((u) => !filtroNivel || u.nivel === filtroNivel);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      const r = await listar({ organizacionId: orgSeleccionada });
      setData(r.data);
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    listarRecursos().then((r) => setRecursos(r.data)).catch(() => setRecursos([]));
  }, []);

  async function enviar(e) {
    e.preventDefault();
    if (Number(form.limiteInferior) >= Number(form.limiteSuperior)) {
      setError('El limite inferior debe ser menor que el superior');
      return;
    }
    const nuevoMin = Number(form.limiteInferior);
    const nuevoMax = Number(form.limiteSuperior);
    const solapa = data
      .filter((u) => String(u.id) !== String(editando))
      .filter((u) => String(u.tipo_recurso_id ?? u.tipoRecursoId ?? '') === String(form.tipoRecursoId || u.tipo_recurso_id))
      .some((u) => nuevoMin <= Number(u.limite_superior) && Number(u.limite_inferior) <= nuevoMax);
    if (solapa) {
      setError('Rangos no deben solaparse');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await actualizar(editando, {
          nombre: form.nombre,
          nivel: form.nivel,
          limiteInferior: Number(form.limiteInferior),
          limiteSuperior: Number(form.limiteSuperior),
        });
        setEditando(null);
      } else {
        await crear({
          organizacionId: orgSeleccionada,
          tipoRecursoId: form.tipoRecursoId,
          nombre: form.nombre,
          nivel: form.nivel,
          limiteInferior: Number(form.limiteInferior),
          limiteSuperior: Number(form.limiteSuperior),
        });
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
      setError(err.detail ? `${err.message}: ${err.detail}` : err.message);
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(u) {
    setEditando(u.id);
    setForm({
      nombre: u.nombre,
      tipoRecursoId: String(u.tipo_recurso_id ?? ''),
      nivel: u.nivel,
      limiteInferior: String(u.limite_inferior),
      limiteSuperior: String(u.limite_superior),
    });
    setError(null);
  }

  function cancelar() {
    setEditando(null);
    setForm(vacio);
    setError(null);
  }

  async function cambiarEstado(u) {
    try {
      setError(null);
      await actualizar(u.id, { estado: u.estado === 'activo' ? 'inactivo' : 'activo' });
      await cargar();
    } catch (e) { setError(e.message); }
  }

  return (
    <section>
      <h2>Umbrales</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario">
        <label>Nivel
          <select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
            <option value="">Todos</option>
            <option value="normal">Normal</option>
            <option value="alerta">Alerta</option>
            <option value="critico">Crítico</option>
          </select>
        </label>
      </form>
      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>Nivel</th><th>Desde</th><th>Hasta</th><th>Estado</th><th /></tr>
        </thead>
        <tbody>
          {visibles.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td><span className={`badge ${u.nivel}`}>{(u.nivel ?? '').toUpperCase()}</span></td>
              <td>{u.limite_inferior}</td>
              <td>{u.limite_superior}</td>
              <td>{u.estado}</td>
              <td>
                <button type="button" onClick={() => empezarEdicion(u)}>Editar</button>{' '}
                <button type="button" onClick={() => cambiarEstado(u)}>
                  {u.estado === 'activo' ? 'Inactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
          {visibles.length === 0 && <tr><td colSpan="6">Sin umbrales</td></tr>}
        </tbody>
      </table>

      <h2>{editando ? 'Editar umbral' : 'Nuevo umbral'}</h2>
      <form className="formulario" onSubmit={enviar}>
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
        <label>Nivel
          <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
            <option value="normal">Normal</option>
            <option value="alerta">Alerta</option>
            <option value="critico">Critico</option>
          </select>
        </label>
        <label>Desde <input type="number" step="0.001" min="0" required
          value={form.limiteInferior} onChange={(e) => setForm({ ...form, limiteInferior: e.target.value })} /></label>
        <label>Hasta <input type="number" step="0.001" min="0" required
          value={form.limiteSuperior} onChange={(e) => setForm({ ...form, limiteSuperior: e.target.value })} /></label>
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>{' '}
        {editando && <button type="button" onClick={cancelar}>Cancelar</button>}
      </form>
    </section>
  );
}
