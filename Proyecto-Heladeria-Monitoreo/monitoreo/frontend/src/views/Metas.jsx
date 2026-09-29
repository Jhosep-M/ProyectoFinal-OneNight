import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear, actualizar } from '../services/metasService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { tipoRecursoId: '', nombre: '', porcentajeReduccion: '', fechaInicio: '', fechaFin: '' };

function mensajeError(err) {
  return Array.isArray(err.detail)
    ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
    : (err.detail ? `${err.message}: ${err.detail}` : err.message);
}

export default function Metas() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');

  const visibles = data.filter((m) => !filtroEstado || m.estado === filtroEstado);

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
    const pct = Number(form.porcentajeReduccion);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError('Meta debe estar entre 0 y 100%');
      return;
    }
    if (form.fechaInicio && form.fechaFin && form.fechaInicio > form.fechaFin) {
      setError('Rango de fechas inválido');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await actualizar(editando, {
          nombre: form.nombre,
          porcentajeReduccion: Number(form.porcentajeReduccion),
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
        });
        setEditando(null);
      } else {
        await crear({
          organizacionId: orgSeleccionada,
          tipoRecursoId: form.tipoRecursoId,
          nombre: form.nombre,
          porcentajeReduccion: Number(form.porcentajeReduccion),
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
        });
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
      // 400 fechas/porcentaje → detalle Zod inline
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(m) {
    setEditando(m.id);
    setForm({
      tipoRecursoId: '',
      nombre: m.nombre,
      porcentajeReduccion: String(m.porcentaje_reduccion),
      fechaInicio: (m.fecha_inicio ?? '').slice(0, 10),
      fechaFin: (m.fecha_fin ?? '').slice(0, 10),
    });
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
      <h2>Metas de reducción</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario">
        <label>Estado
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todas</option>
            <option value="activo">Activas</option>
            <option value="inactivo">Inactivas</option>
          </select>
        </label>
      </form>

      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>%</th><th>Período</th><th>Estado</th><th /></tr>
        </thead>
        <tbody>
          {visibles.map((m) => (
            <tr key={m.id}>
              <td>{m.nombre}</td>
              <td>{Number(m.porcentaje_reduccion)}%
                <div className="progreso" title={`Meta: ${Number(m.porcentaje_reduccion)}%`}>
                  <div className="progreso-barra" style={{ width: `${Math.min(100, Math.max(0, Number(m.porcentaje_reduccion)))}%` }} />
                </div>
              </td>
              <td>{m.fecha_inicio} → {m.fecha_fin}</td>
              <td>{m.estado}</td>
              <td>
                <button type="button" onClick={() => empezarEdicion(m)}>Editar</button>{' '}
                <button type="button" onClick={() => cambiarEstado(m)}>
                  {m.estado === 'activo' ? 'Inactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
          {visibles.length === 0 && <tr><td colSpan="5">Sin metas</td></tr>}
        </tbody>
      </table>

      <h2>{editando ? 'Editar meta' : 'Nueva meta'}</h2>
      <form className="formulario" onSubmit={enviar}>
        {!editando && (
          <select value={form.tipoRecursoId} required
            onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
            <option value="">Recurso…</option>
            {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        )}
        <input placeholder="Nombre" value={form.nombre} required
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input type="number" step="0.01" min="0" max="100" placeholder="% reducción (0-100)" required
          value={form.porcentajeReduccion} onChange={(e) => setForm({ ...form, porcentajeReduccion: e.target.value })} />
        <input type="date" value={form.fechaInicio} required
          onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
        <input type="date" value={form.fechaFin} required
          onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>{' '}
        {editando && <button type="button" onClick={cancelar}>Cancelar</button>}
      </form>
    </section>
  );
}
