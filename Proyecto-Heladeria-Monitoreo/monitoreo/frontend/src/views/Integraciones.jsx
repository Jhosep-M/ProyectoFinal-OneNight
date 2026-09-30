import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar, crear, rotar, cambiarEstado } from '../services/integracionesService';

function mensajeError(err) {
  return Array.isArray(err.detail)
    ? err.detail.map((d) => `${d.path}: ${d.message}`).join(' | ')
    : (err.detail ? `${err.message}: ${err.detail}` : err.message);
}

export default function Integraciones() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState([]);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [rotando, setRotando] = useState(null);
  // La apiKey en plaintext solo existe aquí en memoria hasta descartarla.
  const [claveNueva, setClaveNueva] = useState(null);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      setCargando(true);
      setData((await listar({ organizacionId: orgSeleccionada })).data ?? []);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }, [orgSeleccionada]);

  useEffect(() => { cargar(); }, [cargar]);

  async function enviar(e) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await crear({ organizacionId: orgSeleccionada, nombre: nombre.trim() });
      setClaveNueva({ id: r.integracion?.id, apiKey: r.apiKey });
      setAviso(`Integración "${r.integracion?.nombre ?? nombre.trim()}" creada`);
      setNombre('');
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutarRotar(id) {
    setRotando(id);
    setError(null);
    setAviso(null);
    try {
      const r = await rotar(id);
      setClaveNueva({ id: r.integracion?.id ?? id, apiKey: r.apiKey });
      setAviso('Clave rotada. La anterior quedó invalidada.');
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setRotando(null);
    }
  }

  async function ejecutarEstado(id, estado) {
    setError(null);
    setAviso(null);
    try {
      await cambiarEstado(id, estado);
      setAviso(`Integración ${estado === 'activo' ? 'activada' : 'desactivada'}`);
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  return (
    <section>
      <h2>Integraciones POS</h2>
      <p className="subtitulo">Credenciales API-key para que el POS reporte consumos. La clave solo se muestra una vez.</p>
      {error && (
        <p className="error">
          {error}{' '}
          <button type="button" onClick={cargar} disabled={cargando}>
            {cargando ? 'Reintentando…' : 'Reintentar'}
          </button>
        </p>
      )}
      {aviso && <p className="toast">{aviso}</p>}
      {cargando && <p className="cargando">Cargando...</p>}

      {claveNueva?.apiKey && (
        <div className="detalle" role="alert">
          <h3>Clave generada (se muestra una sola vez)</h3>
          <p>Cópiala ahora. No volverá a mostrarse; si la pierdes, rota la clave.</p>
          <p><code>{claveNueva.apiKey}</code></p>
          <button
            type="button"
            onClick={async () => {
              try { await navigator.clipboard.writeText(claveNueva.apiKey); } catch { /* portapapeles no disponible */ }
            }}
          >
            Copiar
          </button>{' '}
          <button type="button" onClick={() => setClaveNueva(null)}>Ya la guardé, ocultar</button>
        </div>
      )}

      <h2>Nueva integración</h2>
      <form className="formulario" onSubmit={enviar}>
        <label>Nombre
          <input
            placeholder="POS sucursal Miraflores"
            value={nombre}
            required
            maxLength={120}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <div className="form-acciones">
          <button type="submit" disabled={guardando}>{guardando ? 'Creando…' : 'Crear y generar clave'}</button>
        </div>
      </form>

      <h2>Integraciones</h2>
      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>Estado</th><th>Creada</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {data.map((i) => (
            <tr key={i.id}>
              <td title={i.nombre}>{i.nombre}</td>
              <td>{i.estado}</td>
              <td>{i.creado_en ? new Date(i.creado_en).toLocaleString('es') : '-'}</td>
              <td>
                <button type="button" onClick={() => ejecutarRotar(i.id)} disabled={rotando === i.id}>
                  {rotando === i.id ? 'Rotando…' : 'Rotar clave'}
                </button>{' '}
                {i.estado === 'activo' ? (
                  <button type="button" onClick={() => ejecutarEstado(i.id, 'inactivo')}>Desactivar</button>
                ) : (
                  <button type="button" onClick={() => ejecutarEstado(i.id, 'activo')}>Activar</button>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && !error && !cargando && <tr><td colSpan="4">Sin integraciones</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
