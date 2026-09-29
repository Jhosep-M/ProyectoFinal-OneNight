import { useCallback, useEffect, useState } from 'react';
import { listar, crear, actualizar } from '../services/organizacionesService';

const vacio = { nombre: '', nit: '' };

function mensajeError(err) {
  return Array.isArray(err.detail)
    ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
    : (err.detail ? `${err.message}: ${err.detail}` : err.message);
}

export default function Organizaciones() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState(null);
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
      if (editando) {
        await actualizar(editando, { nombre: form.nombre });
        setEditando(null);
      } else {
        await crear({ nombre: form.nombre, nit: form.nit || undefined });
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(o) {
    setEditando(o.id);
    setForm({ nombre: o.nombre, nit: o.nit ?? '' });
    setError(null);
  }

  function cancelar() {
    setEditando(null);
    setForm(vacio);
    setError(null);
  }

  async function cambiarEstado(o) {
    try {
      setError(null);
      await actualizar(o.id, { estado: o.estado === 'activo' ? 'inactivo' : 'activo' });
      await cargar();
    } catch (e) { setError(e.message); }
  }

  return (
    <section>
      <h2>Organizaciones</h2>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>NIT</th><th>Estado</th><th /></tr>
        </thead>
        <tbody>
          {data.map((o) => (
            <tr key={o.id}>
              <td>{o.nombre}</td>
              <td>{o.nit ?? '—'}</td>
              <td>{o.estado}</td>
              <td>
                <button type="button" onClick={() => empezarEdicion(o)}>Editar</button>{' '}
                <button type="button" onClick={() => cambiarEstado(o)}>
                  {o.estado === 'activo' ? 'Inactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="4">Sin organizaciones</td></tr>}
        </tbody>
      </table>

      <h2>{editando ? 'Editar organización' : 'Nueva organización'}</h2>
      <form className="formulario" onSubmit={enviar}>
        <input placeholder="Nombre" value={form.nombre} required
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input placeholder="NIT (opcional)" value={form.nit} disabled={!!editando}
          onChange={(e) => setForm({ ...form, nit: e.target.value })} />
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>{' '}
        {editando && <button type="button" onClick={cancelar}>Cancelar</button>}
      </form>
    </section>
  );
}
