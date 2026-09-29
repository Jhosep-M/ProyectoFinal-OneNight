import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear, listarRecursos } from '../services/medidoresService';

const vacio = { codigoMedidor: '', nombre: '', tipoRecursoId: '' };

function mensajeError(err) {
  return Array.isArray(err.detail)
    ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
    : (err.detail ? `${err.message}: ${err.detail}` : err.message);
}

export default function Medidores() {
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
    setGuardando(true);
    setError(null);
    try {
      await crear({
        organizacionId: orgSeleccionada,
        codigoMedidor: form.codigoMedidor,
        nombre: form.nombre,
        tipoRecursoId: form.tipoRecursoId,
      });
      setForm(vacio);
      await cargar();
    } catch (err) {
      // 409 código duplicado / detalle Zod / 403 → visibles en el form
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h2>Puntos de medición</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario" onSubmit={enviar}>
        <input placeholder="Código (MED-…)" value={form.codigoMedidor} required
          pattern="MED-.*"
          onChange={(e) => setForm({ ...form, codigoMedidor: e.target.value })} />
        <input placeholder="Nombre" value={form.nombre} required
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <select value={form.tipoRecursoId} required
          onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
          <option value="">Recurso…</option>
          {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear medidor'}</button>
      </form>

      <table className="tabla">
        <thead>
          <tr><th>Código</th><th>Nombre</th><th>Recurso</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.id}>
              <td>{m.codigo_medidor}</td>
              <td>{m.nombre}</td>
              <td>{m.tipoRecurso?.nombre ?? '—'}</td>
              <td>{m.estado}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="4">Sin medidores</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
