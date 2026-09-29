import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear, actualizar, eliminar } from '../services/umbralService';
import { listarRecursos } from '../services/medidoresService';

const vacio = { id: null, nombre: '', tipoRecursoId: '', nivel: 'normal', limiteInferior: '', limiteSuperior: '', estado: 'activo' };

const LIMITE_INFINITO = 999999999;

function unidadDe(nombre) {
  const n = (nombre ?? '').toLowerCase();
  if (n.includes('agua')) return 'litros';
  if (n.includes('energia') || n.includes('energía')) return 'kWh';
  return '';
}

function fmtNum(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  if (n >= LIMITE_INFINITO) return '∞';
  return n.toLocaleString('es', { maximumFractionDigits: 3 });
}

export default function Umbrales() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      const r = await listar({ organizacionId: orgSeleccionada, incluirInactivos: verInactivos });
      setData(r.data ?? []);
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada, verInactivos]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    listarRecursos().then((r) => setRecursos(r.data ?? [])).catch(() => setRecursos([]));
  }, []);

  const unidadForm = unidadDe(recursos.find((r) => String(r.id) === String(form.tipoRecursoId))?.nombre);

  function recursoDe(u) {
    return u.tipoRecurso?.nombre ?? recursos.find((r) => String(r.id) === String(u.tipo_recurso_id ?? u.tipoRecursoId))?.nombre ?? '';
  }

  function editar(u) {
    setError(null);
    setAviso(null);
    setForm({
      id: u.id,
      nombre: u.nombre ?? '',
      tipoRecursoId: u.tipo_recurso_id ?? u.tipoRecursoId ?? '',
      nivel: u.nivel ?? 'normal',
      limiteInferior: u.limite_inferior ?? '',
      limiteSuperior: u.limite_superior ?? '',
      estado: u.estado ?? 'activo',
    });
  }

  function cancelar() {
    setForm(vacio);
    setError(null);
  }

  async function enviar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!form.tipoRecursoId) {
      setError('El recurso es obligatorio');
      return;
    }
    if (form.limiteInferior === '' || form.limiteSuperior === '' || Number.isNaN(Number(form.limiteInferior)) || Number.isNaN(Number(form.limiteSuperior))) {
      setError('Desde y Hasta deben ser numéricos');
      return;
    }
    if (Number(form.limiteInferior) >= Number(form.limiteSuperior)) {
      setError('El limite inferior debe ser menor que el superior');
      return;
    }
    const nuevoMin = Number(form.limiteInferior);
    const nuevoMax = Number(form.limiteSuperior);
    const solapa = data
      .filter((u) => String(u.id) !== String(form.id) && String(u.tipo_recurso_id ?? u.tipoRecursoId ?? '') === String(form.tipoRecursoId))
      .some((u) => nuevoMin <= Number(u.limite_superior) && Number(u.limite_inferior) <= nuevoMax);
    if (solapa) {
      setError('Rangos no deben solaparse');
      return;
    }
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const payload = {
        organizacionId: orgSeleccionada,
        tipoRecursoId: form.tipoRecursoId,
        nombre: form.nombre.trim(),
        nivel: form.nivel,
        limiteInferior: Number(form.limiteInferior),
        limiteSuperior: Number(form.limiteSuperior),
        ...(form.id ? { estado: form.estado } : {}),
      };
      if (form.id) {
        await actualizar(form.id, payload);
        setAviso('Umbral actualizado');
      } else {
        await crear(payload);
        setAviso('Umbral creado');
      }
      setForm(vacio);
      await cargar();
    } catch (err) {
      setError(err.detail ? `${err.message}: ${err.detail}` : err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    setError(null);
    try {
      await eliminar(porEliminar.id);
      setData((prev) => prev.filter((u) => String(u.id) !== String(porEliminar.id)));
      if (String(form.id) === String(porEliminar.id)) setForm(vacio);
      setAviso(`Umbral "${porEliminar.nombre}" eliminado`);
      setPorEliminar(null);
    } catch (err) {
      setError(err.detail ? `${err.message}: ${err.detail}` : err.message);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <section>
      <h2>Umbrales</h2>
      {error && <p className="error">{error}</p>}
      {aviso && <p className="toast">{aviso}</p>}
      <form className="formulario" onSubmit={(e) => e.preventDefault()}>
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
            <col style={{ width: '24%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr><th>Nombre</th><th className="centro">Nivel</th><th className="num">Desde</th><th className="num">Hasta</th><th>Unidad</th><th className="centro">Estado</th><th className="acciones-th">Acciones</th></tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td title={u.nombre}>{u.nombre}</td>
                <td className="centro"><span className={`badge ${u.nivel}`}>{(u.nivel ?? '').toUpperCase()}</span></td>
                <td className="num">{fmtNum(u.limite_inferior)}</td>
                <td className="num">{fmtNum(u.limite_superior)}</td>
                <td>{unidadDe(recursoDe(u)) || '-'}</td>
                <td className="centro">{u.estado}</td>
                <td>
                  <span className="tabla-acciones">
                    <button type="button" onClick={() => editar(u)}>Editar</button>
                    <button type="button" className="peligro" onClick={(e) => { e.stopPropagation(); setPorEliminar(u); }}>Eliminar</button>
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr className="fila-vacia"><td colSpan={7}>Sin umbrales</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>{form.id ? 'Editar umbral' : 'Nuevo umbral'}</h2>
      <form className="formulario form-grid" onSubmit={enviar}>
        <label>Nombre
          <input placeholder="Nombre" value={form.nombre} required
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>Recurso
          <select value={form.tipoRecursoId} required
            onChange={(e) => setForm({ ...form, tipoRecursoId: e.target.value })}>
            <option value="">Seleccione...</option>
            {recursos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        <label>Nivel
          <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
            <option value="normal">Normal</option>
            <option value="alerta">Alerta</option>
            <option value="critico">Critico</option>
          </select>
        </label>
        <label>Desde {unidadForm ? `(${unidadForm})` : ''}
          <input type="number" step="0.001" min="0" required
            value={form.limiteInferior} onChange={(e) => setForm({ ...form, limiteInferior: e.target.value })} />
        </label>
        <label>Hasta {unidadForm ? `(${unidadForm})` : ''}
          <input type="number" step="0.001" min="0" required
            value={form.limiteSuperior} onChange={(e) => setForm({ ...form, limiteSuperior: e.target.value })} />
        </label>
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
            <h3>Eliminar umbral</h3>
            <p>¿Eliminar el umbral «{porEliminar.nombre}»? Esta acción no se puede deshacer. Quedará registrado en auditoría.</p>
            <div className="form-acciones">
              <button type="button" onClick={() => setPorEliminar(null)} disabled={eliminando}>Cancelar</button>
              <button type="button" className="peligro" onClick={ejecutarEliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
