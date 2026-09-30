import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
<<<<<<< HEAD
<<<<<<< HEAD
import { listar, crear } from '../services/metasService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { tipoRecursoId: '', nombre: '', porcentajeReduccion: '', fechaInicio: '', fechaFin: '' };
=======
import { listar, crear, actualizar, eliminar } from '../services/metasService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { id: null, tipoRecursoId: '', nombre: '', porcentajeReduccion: '', fechaInicio: '', fechaFin: '', estado: 'activo' };
>>>>>>> origin/feature/Airton-auxilio
=======
import { listar, crear, actualizar, eliminar } from '../services/metasService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { id: null, tipoRecursoId: '', nombre: '', porcentajeReduccion: '', fechaInicio: '', fechaFin: '', estado: 'activo' };
>>>>>>> develop

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
<<<<<<< HEAD
<<<<<<< HEAD
  const [guardando, setGuardando] = useState(false);
=======
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
>>>>>>> origin/feature/Airton-auxilio
=======
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
>>>>>>> develop

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
<<<<<<< HEAD
<<<<<<< HEAD
      setData((await listar({ organizacionId: orgSeleccionada })).data);
=======
      setData((await listar({ organizacionId: orgSeleccionada, incluirInactivos: verInactivos })).data ?? []);
>>>>>>> develop
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada, verInactivos]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    listarRecursos().then((r) => setRecursos(r.data ?? [])).catch(() => setRecursos([]));
  }, []);

  function editar(m) {
    setError(null);
    setAviso(null);
    setForm({
      id: m.id,
      tipoRecursoId: m.tipo_recurso_id ?? m.tipoRecursoId ?? '',
      nombre: m.nombre ?? '',
      porcentajeReduccion: m.porcentaje_reduccion ?? '',
      fechaInicio: (m.fecha_inicio ?? '').slice(0, 10),
      fechaFin: (m.fecha_fin ?? '').slice(0, 10),
      estado: m.estado ?? 'activo',
    });
  }

  function cancelar() {
    setForm(vacio);
    setError(null);
  }

  async function enviar(e) {
    e.preventDefault();
    const pct = Number(form.porcentajeReduccion);
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!form.tipoRecursoId && !form.id) {
      setError('El recurso es obligatorio');
      return;
    }
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError('Meta debe estar entre 0 y 100%');
      return;
    }
    if (!form.fechaInicio || !form.fechaFin) {
      setError('Las fechas son obligatorias');
      return;
    }
    if (form.fechaInicio > form.fechaFin) {
      setError('Rango de fechas inválido');
      return;
    }
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      if (form.id) {
        await actualizar(form.id, {
          nombre: form.nombre.trim(),
          porcentajeReduccion: pct,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          estado: form.estado,
        });
        setAviso('Meta actualizada');
      } else {
        await crear({
          organizacionId: orgSeleccionada,
          tipoRecursoId: form.tipoRecursoId,
          nombre: form.nombre.trim(),
          porcentajeReduccion: pct,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
        });
        setAviso('Meta creada');
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
<<<<<<< HEAD
      // 400 fechas/porcentaje → detalle Zod inline
=======
      setData((await listar({ organizacionId: orgSeleccionada, incluirInactivos: verInactivos })).data ?? []);
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada, verInactivos]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    listarRecursos().then((r) => setRecursos(r.data ?? [])).catch(() => setRecursos([]));
  }, []);

  function editar(m) {
    setError(null);
    setAviso(null);
    setForm({
      id: m.id,
      tipoRecursoId: m.tipo_recurso_id ?? m.tipoRecursoId ?? '',
      nombre: m.nombre ?? '',
      porcentajeReduccion: m.porcentaje_reduccion ?? '',
      fechaInicio: (m.fecha_inicio ?? '').slice(0, 10),
      fechaFin: (m.fecha_fin ?? '').slice(0, 10),
      estado: m.estado ?? 'activo',
    });
  }

  function cancelar() {
    setForm(vacio);
    setError(null);
  }

  async function enviar(e) {
    e.preventDefault();
    const pct = Number(form.porcentajeReduccion);
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!form.tipoRecursoId && !form.id) {
      setError('El recurso es obligatorio');
      return;
    }
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError('Meta debe estar entre 0 y 100%');
      return;
    }
    if (!form.fechaInicio || !form.fechaFin) {
      setError('Las fechas son obligatorias');
      return;
    }
    if (form.fechaInicio > form.fechaFin) {
      setError('Rango de fechas inválido');
      return;
    }
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      if (form.id) {
        await actualizar(form.id, {
          nombre: form.nombre.trim(),
          porcentajeReduccion: pct,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          estado: form.estado,
        });
        setAviso('Meta actualizada');
      } else {
        await crear({
          organizacionId: orgSeleccionada,
          tipoRecursoId: form.tipoRecursoId,
          nombre: form.nombre.trim(),
          porcentajeReduccion: pct,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
        });
        setAviso('Meta creada');
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
>>>>>>> origin/feature/Airton-auxilio
=======
>>>>>>> develop
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> develop
  async function ejecutarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    setError(null);
    try {
      await eliminar(porEliminar.id);
      setData((prev) => prev.filter((m) => String(m.id) !== String(porEliminar.id)));
      if (String(form.id) === String(porEliminar.id)) setForm(vacio);
      setAviso(`Meta "${porEliminar.nombre}" eliminada`);
      setPorEliminar(null);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEliminando(false);
    }
  }

<<<<<<< HEAD
>>>>>>> origin/feature/Airton-auxilio
=======
>>>>>>> develop
  return (
    <section>
      <h2>Metas de reducción</h2>
      {error && <p className="error">{error}</p>}
<<<<<<< HEAD
<<<<<<< HEAD
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
              <td>{Number(m.porcentaje_reduccion)}%</td>
              <td>{m.fecha_inicio} → {m.fecha_fin}</td>
              <td>{m.estado}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="4">Sin metas</td></tr>}
        </tbody>
      </table>
=======
      {aviso && <p className="toast">{aviso}</p>}
      <form className="formulario" onSubmit={(e) => e.preventDefault()}>
        <label>
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
          /> Mostrar inactivas
        </label>
      </form>

=======
      {aviso && <p className="toast">{aviso}</p>}
      <form className="formulario" onSubmit={(e) => e.preventDefault()}>
        <label>
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
          /> Mostrar inactivas
        </label>
      </form>

>>>>>>> develop
      <h2>{form.id ? 'Editar meta' : 'Nueva meta'}</h2>
      <form className="formulario form-grid" onSubmit={enviar}>
        {!form.id && (
          <label>Recurso
            <select value={form.tipoRecursoId} required
              onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
              <option value="">Recurso…</option>
              {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </label>
        )}
        <label>Nombre
          <input placeholder="Nombre" value={form.nombre} required
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>% reducción (0-100)
          <input type="number" step="0.01" min="0" max="100" required
            value={form.porcentajeReduccion} onChange={(e) => setForm({ ...form, porcentajeReduccion: e.target.value })} />
        </label>
        <label>Inicio
          <input type="date" value={form.fechaInicio} required
            onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
        </label>
        <label>Fin
          <input type="date" value={form.fechaFin} required
            onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
        </label>
        {form.id && (
          <label>Estado
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="cumplida">Cumplida</option>
              <option value="incumplida">Incumplida</option>
            </select>
          </label>
        )}
        <div className="form-acciones">
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : (form.id ? 'Actualizar' : 'Crear meta')}</button>
          {form.id && <button type="button" onClick={cancelar} disabled={guardando}>Cancelar</button>}
        </div>
      </form>

      <h2>Metas de reducción</h2>
      <div className="tabla-scroll">
        <table className="tabla tabla-umbrales">
          <colgroup>
            <col style={{ width: '30%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <thead>
            <tr><th>Nombre</th><th className="num">%</th><th>Período</th><th className="centro">Estado</th><th className="acciones-th">Acciones</th></tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td title={m.nombre}>{m.nombre}</td>
                <td className="num">{Number(m.porcentaje_reduccion)}%
                  <div className="progreso" title={`Meta: ${Number(m.porcentaje_reduccion)}%`}>
                    <div className="progreso-barra" style={{ width: `${Math.min(100, Math.max(0, Number(m.porcentaje_reduccion)))}%` }} />
                  </div>
                </td>
                <td>{(m.fecha_inicio ?? '').slice(0, 10)} → {(m.fecha_fin ?? '').slice(0, 10)}</td>
                <td className="centro">{m.estado}</td>
                <td>
                  <span className="tabla-acciones">
                    <button type="button" onClick={() => editar(m)}>Editar</button>
                    <button type="button" className="peligro" onClick={(e) => { e.stopPropagation(); setPorEliminar(m); }}>Eliminar</button>
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr className="fila-vacia"><td colSpan={5}>Sin metas</td></tr>}
          </tbody>
        </table>
      </div>

      {porEliminar && (
        <div className="modal-fondo" onClick={() => !eliminando && setPorEliminar(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
            <h3>Eliminar meta</h3>
            <p>¿Eliminar la meta «{porEliminar.nombre}»? Esta acción no se puede deshacer. Quedará registrada en auditoría.</p>
            <div className="form-acciones">
              <button type="button" onClick={() => setPorEliminar(null)} disabled={eliminando}>Cancelar</button>
              <button type="button" className="peligro" onClick={ejecutarEliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
<<<<<<< HEAD
>>>>>>> origin/feature/Airton-auxilio
=======
>>>>>>> develop
    </section>
  );
}
