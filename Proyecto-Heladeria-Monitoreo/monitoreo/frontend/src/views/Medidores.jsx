import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
<<<<<<< HEAD
import { listar, crear, listarRecursos } from '../services/medidoresService';

const vacio = { codigoMedidor: '', nombre: '', tipoRecursoId: '' };

function mensajeError(err) {
  return Array.isArray(err.detail)
    ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
    : (err.detail ? `${err.message}: ${err.detail}` : err.message);
}
=======
import { listar, crear, actualizar, eliminar, listarRecursos } from '../services/medidoresService';

const vacio = { id: null, codigoMedidor: '', nombre: '', tipoRecursoId: '', estado: 'activo' };
>>>>>>> origin/feature/Airton-auxilio

export default function Medidores() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState(null);
<<<<<<< HEAD
  const [guardando, setGuardando] = useState(false);
=======
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const visibles = data.filter((m) => !filtro || (m.tipoRecurso?.nombre ?? '').toLowerCase().includes(filtro));
>>>>>>> origin/feature/Airton-auxilio

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
<<<<<<< HEAD
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
      codigoMedidor: m.codigo_medidor ?? '',
      nombre: m.nombre ?? '',
      tipoRecursoId: m.tipo_recurso_id ?? m.tipoRecursoId ?? '',
      estado: m.estado ?? 'activo',
    });
  }

  function cancelar() {
    setForm(vacio);
    setError(null);
  }

  async function ejecutarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    setError(null);
    try {
      await eliminar(porEliminar.id);
      setData((prev) => prev.filter((m) => String(m.id) !== String(porEliminar.id)));
      if (String(form.id) === String(porEliminar.id)) setForm(vacio);
      setAviso(`Medidor "${porEliminar.codigo_medidor}" eliminado`);
      setPorEliminar(null);
    } catch (err) {
      setError(err.detail ? `${err.message}: ${err.detail}` : err.message);
    } finally {
      setEliminando(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      if (form.id) {
        await actualizar(form.id, {
          codigoMedidor: form.codigoMedidor,
          nombre: form.nombre.trim(),
          estado: form.estado,
        });
        setAviso('Medidor actualizado');
      } else {
        await crear({
          organizacionId: orgSeleccionada,
          codigoMedidor: form.codigoMedidor,
          nombre: form.nombre.trim(),
          tipoRecursoId: form.tipoRecursoId,
        });
        setAviso('Medidor creado');
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
      if (err.status === 409) {
        setError('Código medidor ya existe');
      } else {
        setError(err.detail ? `${err.message}: ${err.detail}` : err.message);
      }
>>>>>>> origin/feature/Airton-auxilio
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
<<<<<<< HEAD
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
=======
      <h2>Puntos de medicion</h2>
      {error && <p className="error">{error}</p>}
      {aviso && <p className="toast">{aviso}</p>}
      <form className="formulario" onSubmit={(e) => e.preventDefault()}>
        <label>Recurso
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="agua">Agua</option>
            <option value="energia">Energia</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
          /> Mostrar inactivos
        </label>
      </form>
      <div className="tabla-scroll">
        <table className="tabla tabla-umbrales">
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '26%' }} />
          </colgroup>
          <thead>
            <tr><th>Codigo</th><th>Nombre</th><th>Recurso</th><th className="centro">Estado</th><th className="acciones-th">Acciones</th></tr>
          </thead>
          <tbody>
            {visibles.map((m) => {
              return (
                <tr key={m.id}>
                  <td><code>{m.codigo_medidor}</code></td>
                  <td title={m.nombre}>{m.nombre}</td>
                  <td><span className={`badge ${(m.tipoRecurso?.nombre ?? '').toLowerCase().includes('agua') ? 'agua' : 'energia'}`}>{m.tipoRecurso?.nombre ?? '-'}</span></td>
                  <td className="centro">{m.estado}</td>
                  <td>
                    <span className="tabla-acciones">
                      <button type="button" onClick={() => editar(m)}>Editar</button>
                      <button type="button" className="peligro" onClick={(e) => { e.stopPropagation(); setPorEliminar(m); }}>Eliminar</button>
                    </span>
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && <tr className="fila-vacia"><td colSpan={5}>Sin medidores</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>{form.id ? 'Editar medidor' : 'Nuevo medidor'}</h2>
      <form className="formulario form-grid" onSubmit={enviar}>
        <label>Codigo
          <input placeholder="MED-001" value={form.codigoMedidor} required
            pattern="MED-.*"
            onChange={(e) => setForm({ ...form, codigoMedidor: e.target.value })} />
        </label>
        <label>Nombre
          <input placeholder="Nombre" value={form.nombre} required
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        {!form.id && (
          <label>Recurso
            <select value={form.tipoRecursoId} required
              onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
              <option value="">Seleccione...</option>
              {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </label>
        )}
        {form.id && (
          <label>Estado
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
        )}
        <div className="form-acciones">
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : (form.id ? 'Actualizar' : 'Guardar')}</button>
          {form.id && <button type="button" onClick={cancelar} disabled={guardando}>Cancelar</button>}
        </div>
      </form>

      {porEliminar && (
        <div className="modal-fondo" onClick={() => !eliminando && setPorEliminar(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
            <h3>Eliminar medidor</h3>
            <p>¿Eliminar el medidor «{porEliminar.codigo_medidor}»? Esta acción no se puede deshacer. Quedará registrado en auditoría.</p>
            <div className="form-acciones">
              <button type="button" onClick={() => setPorEliminar(null)} disabled={eliminando}>Cancelar</button>
              <button type="button" className="peligro" onClick={ejecutarEliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
>>>>>>> origin/feature/Airton-auxilio
    </section>
  );
}
