import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear } from '../services/umbralService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { nombre: '', tipoRecursoId: '', nivel: 'normal', limiteInferior: '', limiteSuperior: '' };

export default function Umbrales() {
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
    setGuardando(true);
    setError(null);
    try {
      await crear({
        organizacionId: orgSeleccionada,
        tipoRecursoId: form.tipoRecursoId,
        nombre: form.nombre,
        nivel: form.nivel,
        limiteInferior: Number(form.limiteInferior),
        limiteSuperior: Number(form.limiteSuperior),
      });
      setForm(vacio);
      await cargar();
    } catch (err) {
      // 400 'Rango solapado' / detalle de campos / 403 → visibles en el form
      setError(Array.isArray(err.detail)
        ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
        : (err.detail ? `${err.message}: ${err.detail}` : err.message));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h2>Umbrales de clasificación</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario" onSubmit={enviar}>
        <input placeholder="Nombre" value={form.nombre} required
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <select value={form.tipoRecursoId} required
          onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
          <option value="">Recurso…</option>
          {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
          <option value="normal">Normal</option>
          <option value="alerta">Alerta</option>
          <option value="critico">Crítico</option>
        </select>
        <input type="number" step="0.001" min="0" placeholder="Límite inferior" required
          value={form.limiteInferior} onChange={(e) => setForm({ ...form, limiteInferior: e.target.value })} />
        <input type="number" step="0.001" min="0" placeholder="Límite superior" required
          value={form.limiteSuperior} onChange={(e) => setForm({ ...form, limiteSuperior: e.target.value })} />
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear umbral'}</button>
      </form>

      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>Nivel</th><th>Rango</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td><span className={`badge ${u.nivel}`}>{u.nivel}</span></td>
              <td>[{Number(u.limite_inferior)}, {Number(u.limite_superior)})</td>
              <td>{u.estado}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="4">Sin umbrales</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
