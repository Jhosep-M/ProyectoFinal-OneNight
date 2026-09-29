import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear } from '../services/metasService';
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
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

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
      await crear({
        organizacionId: orgSeleccionada,
        tipoRecursoId: form.tipoRecursoId,
        nombre: form.nombre,
        porcentajeReduccion: Number(form.porcentajeReduccion),
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
      });
      setForm(vacio);
      await cargar();
    } catch (err) {
      // 400 fechas/porcentaje → detalle Zod inline
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h2>Metas de reducción</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario" onSubmit={enviar}>
        <select value={form.tipoRecursoId} required
          onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
          <option value="">Recurso…</option>
          {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <input placeholder="Nombre" value={form.nombre} required
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input type="number" step="0.01" min="0" max="100" placeholder="% reducción (0-100)" required
          value={form.porcentajeReduccion} onChange={(e) => setForm({ ...form, porcentajeReduccion: e.target.value })} />
        <input type="date" value={form.fechaInicio} required
          onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
        <input type="date" value={form.fechaFin} required
          onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear meta'}</button>
      </form>

      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>%</th><th>Período</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.id}>
              <td>{m.nombre}</td>
              <td>{Number(m.porcentaje_reduccion)}%
                <div className="progreso" title={`Meta: ${Number(m.porcentaje_reduccion)}%`}>
                  <div className="progreso-barra" style={{ width: `${Math.min(100, Math.max(0, Number(m.porcentaje_reduccion)))}%` }} />
                </div>
              </td>
              <td>{m.fecha_inicio} → {m.fecha_fin}</td>
              <td>{m.estado}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="4">Sin metas</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
