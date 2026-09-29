import { useCallback, useEffect, useState } from 'react';
import { listar, crear } from '../services/organizacionesService';

const vacio = { nombre: '', nit: '' };

function mensajeError(err) {
  return Array.isArray(err.detail)
    ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
    : (err.detail ? `${err.message}: ${err.detail}` : err.message);
}

export default function Organizaciones() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      setData((await listar()).data);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crear({ nombre: form.nombre, nit: form.nit || undefined });
      setForm(vacio);
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h2>Organizaciones</h2>
      {error && <p className="error">{error}</p>}
      <form className="formulario" onSubmit={enviar}>
        <input placeholder="Nombre" value={form.nombre} required
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input placeholder="NIT (opcional)" value={form.nit}
          onChange={(e) => setForm({ ...form, nit: e.target.value })} />
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear organización'}</button>
      </form>

      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>NIT</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {data.map((o) => (
            <tr key={o.id}>
              <td>{o.nombre}</td>
              <td>{o.nit ?? '—'}</td>
              <td>{o.estado}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="3">Sin organizaciones</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
