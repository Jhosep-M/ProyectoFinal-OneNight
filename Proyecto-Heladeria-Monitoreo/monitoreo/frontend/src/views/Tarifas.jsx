import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear, actualizar } from '../services/tarifasService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { tipoRecursoId: '', nombre: '', monto: '', unidad: '', fechaInicio: '', fechaFin: '' };

function mensajeError(err) {
  return Array.isArray(err.detail)
    ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
    : (err.detail ? `${err.message}: ${err.detail}` : err.message);
}

export default function Tarifas() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [calc, setCalc] = useState({ cantidad: '', tarifaId: '' });

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
          monto: Number(form.monto),
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
        });
        setEditando(null);
      } else {
        await crear({
          organizacionId: orgSeleccionada,
          tipoRecursoId: form.tipoRecursoId,
          nombre: form.nombre,
          monto: Number(form.monto),
          unidad: form.unidad,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
        });
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
      // 400 'Período solapado' → err.message inline
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(t) {
    setEditando(t.id);
    setForm({
      tipoRecursoId: '',
      nombre: t.nombre,
      monto: String(t.monto),
      unidad: t.unidad,
      fechaInicio: (t.fecha_inicio ?? '').slice(0, 10),
      fechaFin: (t.fecha_fin ?? '').slice(0, 10),
    });
    setError(null);
  }

  function cancelar() {
    setEditando(null);
    setForm(vacio);
    setError(null);
  }

  return (
    <section>
      <h2>Tarifas</h2>
      {error && <p className="error">{error}</p>}
      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>Monto</th><th>Unidad</th><th>Período</th><th /></tr>
        </thead>
        <tbody>
          {data.map((t) => (
            <tr key={t.id}>
              <td>{t.nombre}</td>
              <td>{Number(t.monto).toFixed(4)}</td>
              <td>{t.unidad}</td>
              <td>{t.fecha_inicio} → {t.fecha_fin}</td>
              <td><button type="button" onClick={() => empezarEdicion(t)}>Editar</button></td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="5">Sin tarifas</td></tr>}
        </tbody>
      </table>

      <h2>{editando ? 'Editar tarifa' : 'Nueva tarifa'}</h2>
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
        <input type="number" step="0.0001" min="0" placeholder="Monto" required
          value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
        <input placeholder="Unidad" value={form.unidad} required disabled={!!editando}
          onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
        <input type="date" value={form.fechaInicio} required
          onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
        <input type="date" value={form.fechaFin} required
          onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>{' '}
        {editando && <button type="button" onClick={cancelar}>Cancelar</button>}
      </form>

      <h2>Calculadora de costo</h2>
      <form className="formulario" onSubmit={(e) => e.preventDefault()}>
        <label>Cantidad <input type="number" step="0.0001" min="0" value={calc.cantidad} onChange={(e) => setCalc({ ...calc, cantidad: e.target.value })} /></label>
        <label>Tarifa
          <select value={calc.tarifaId} onChange={(e) => setCalc({ ...calc, tarifaId: e.target.value })}>
            <option value="">Seleccione...</option>
            {data.map((t) => <option key={t.id} value={t.id}>{t.nombre} - {Number(t.monto).toFixed(4)}</option>)}
          </select>
        </label>
        <p>Costo: {(() => {
          const t = data.find((x) => String(x.id) === String(calc.tarifaId));
          if (!t || !calc.cantidad) return '-';
          return `${(Number(calc.cantidad) * Number(t.monto)).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
        })()}</p>
      </form>
    </section>
  );
}
