import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Deriva un nombre mostrable sin duplicar el email.
 * Si no hay nombre en user_metadata, humaniza el prefijo del email:
 * "molloemerson10@gmail.com" -> "Molloemerson10".
 */
export function nombreMostrable(metadataName, email) {
  const n = String(metadataName || '').trim();
  if (n) return n;
  const prefix = String(email || '').split('@')[0] || '';
  const words = prefix.replace(/[._-]+/g, ' ').trim();
  if (!words) return 'Usuario';
  return words
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Agrupa "modulo.accion.resto" por módulo para el modal de perfil. */
export function agruparPermisos(permisos = []) {
  const map = new Map();
  for (const p of permisos || []) {
    const s = String(p);
    const idx = s.indexOf('.');
    const modulo = idx > 0 ? s.slice(0, idx) : 'general';
    const accion = idx > 0 ? s.slice(idx + 1) : s;
    if (!map.has(modulo)) map.set(modulo, []);
    map.get(modulo).push(accion);
  }
  return [...map.entries()]
    .map(([modulo, acciones]) => ({ modulo, acciones: [...new Set(acciones)].sort() }))
    .sort((a, b) => a.modulo.localeCompare(b.modulo));
}

const ICONOS_MODULO = {
  venta: 'bi-cart',
  turno: 'bi-cash-register',
  producto: 'bi-box',
  inventario: 'bi-boxes',
  pedido: 'bi-clipboard',
  mesa: 'bi-grid-3x3',
  pago: 'bi-credit-card',
  usuario: 'bi-person-gear',
  rol: 'bi-shield',
  promocion: 'bi-tag',
  configuracion: 'bi-gear',
  auditoria: 'bi-shield-check',
  devolucion: 'bi-arrow-counterclockwise',
  integracion: 'bi-plug',
  cliente: 'bi-people',
};
export function iconoModulo(modulo) {
  return ICONOS_MODULO[String(modulo || '').toLowerCase()] || 'bi-key';
}
import { useAuth } from '../../context/AuthContext.jsx';
import { usePermisos } from '../../context/PermisosContext.jsx';
import { useRol } from '../../hooks/useRol.js';
import Avatar from './Avatar.jsx';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Input from './Input.jsx';
import Alert from './Alert.jsx';

/**
 * UserMenu — menú universal del avatar (M) en el header.
 * Sin RequirePermiso: visible para todos los roles (admin, supervisor,
 * cajero, mesero, inventario, cocinero) porque vive en Header/MainLayout,
 * fuera de las rutas con permiso. Solo usa identidad del JWT (session).
 */
export default function UserMenu() {
  const { session, signOut, actualizarPassword } = useAuth();
  const { permisos } = usePermisos();
  const { rol } = useRol();
  const navigate = useNavigate();

  const [abierto, setAbierto] = useState(false);
  const [verPerfil, setVerPerfil] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalir, setErrorSalir] = useState('');

  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorPwd, setErrorPwd] = useState('');
  const [okPwd, setOkPwd] = useState('');

  const wrapRef = useRef(null);

  const email = session?.user?.email || '—';
  const nombre = nombreMostrable(session?.user?.user_metadata?.name, session?.user?.email);
  // Alias para trigger/aria: nombre mostrable (ya no duplica el email).
  const userName = nombre;
  const miembroDesde = (() => {
    const raw = session?.user?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const grupos = useMemo(() => agruparPermisos(permisos), [permisos]);
  const [expandidos, setExpandidos] = useState(() => new Set());
  const [verTodos, setVerTodos] = useState(false);
  const esExpandido = (modulo) =>
    verTodos || expandidos.has(modulo) || (expandidos.size === 0 && grupos[0]?.modulo === modulo);
  const toggleModulo = (modulo) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(modulo)) next.delete(modulo);
      else next.add(modulo);
      return next;
    });
  };

  // Cerrar con Escape y con click fuera. Sin solapar llamadas.
  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [abierto]);

  const abrirPerfil = () => {
    setAbierto(false);
    setExpandidos(new Set());
    setVerTodos(false);
    setVerPerfil(true);
  };

  const abrirPassword = () => {
    setAbierto(false);
    setErrorPwd('');
    setOkPwd('');
    setNueva('');
    setConfirmar('');
    setVerPassword(true);
  };

  const handleSalir = async () => {
    if (saliendo) return;
    setErrorSalir('');
    setSaliendo(true);
    try {
      await signOut();
      setAbierto(false);
      navigate('/login', { replace: true });
    } catch {
      setErrorSalir('No se pudo cerrar sesión. Intenta de nuevo.');
    } finally {
      setSaliendo(false);
    }
  };

  const handleGuardarPassword = async (e) => {
    e?.preventDefault?.();
    setErrorPwd('');
    setOkPwd('');
    const pwd = String(nueva || '');
    if (pwd.length < 8) {
      setErrorPwd('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (pwd !== String(confirmar || '')) {
      setErrorPwd('Las contraseñas no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      await actualizarPassword(pwd);
      setOkPwd('Contraseña actualizada correctamente.');
      setNueva('');
      setConfirmar('');
    } catch (err) {
      // Mensaje controlado, sin exponer stack traces (AGENTS §4.6).
      setErrorPwd(err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="user-menu" ref={wrapRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Menú de usuario: ${userName}`}
        title={userName}
      >
        <Avatar name={userName} size="md" />
      </button>

      {abierto && (
        <div className="user-menu-pop" role="menu" aria-label="Opciones de usuario">
          <div className="user-menu-head">
            <div className="user-menu-name">{userName}</div>
            <div className="user-menu-email">{email}</div>
            {rol && <div className="user-menu-rol">Rol: {rol}</div>}
          </div>
          <button type="button" role="menuitem" className="user-menu-item" onClick={abrirPerfil}>
            <i className="bi bi-person" aria-hidden="true"></i>
            <span>Mi perfil</span>
          </button>
          <button type="button" role="menuitem" className="user-menu-item" onClick={abrirPassword}>
            <i className="bi bi-key" aria-hidden="true"></i>
            <span>Cambiar contraseña</span>
          </button>
          <div className="user-menu-sep" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            className="user-menu-item user-menu-salir"
            onClick={handleSalir}
            disabled={saliendo}
          >
            <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
            <span>{saliendo ? 'Saliendo…' : 'Cerrar sesión'}</span>
          </button>
          {errorSalir && (
            <div className="user-menu-error" role="alert">
              {errorSalir}
            </div>
          )}
        </div>
      )}

      <Modal show={verPerfil} onClose={() => setVerPerfil(false)} title="Mi perfil">
        <div className="user-menu-card">
          <Avatar name={nombre} size="lg" />
          <div className="user-menu-card-info">
            <div className="user-menu-card-name">{nombre}</div>
            <div className="user-menu-card-email">{email}</div>
            <div className="user-menu-card-meta">
              {rol ? (
                <span className={`user-menu-badge user-menu-badge--${String(rol).toLowerCase()}`}>
                  {rol}
                </span>
              ) : (
                <span className="user-menu-badge">sin rol</span>
              )}
              <span className="user-menu-count">{permisos?.length || 0} permisos</span>
              {miembroDesde && <span className="user-menu-desde">Desde {miembroDesde}</span>}
            </div>
          </div>
        </div>

        <div className="user-menu-perm-head">
          <span>Permisos por módulo</span>
          {grupos.length > 1 && (
            <button
              type="button"
              className="user-menu-ver-todos"
              onClick={() => setVerTodos((v) => !v)}
              aria-expanded={verTodos}
            >
              {verTodos ? 'Ocultar' : 'Ver todos'}
            </button>
          )}
        </div>
        {grupos.length ? (
          <div className="user-menu-grupos">
            {grupos.map((g) => {
              const expandido = esExpandido(g.modulo);
              return (
                <div key={g.modulo} className="user-menu-grupo">
                  <button
                    type="button"
                    className="user-menu-grupo-btn"
                    aria-expanded={expandido}
                    aria-controls={`perm-${g.modulo}`}
                    onClick={() => toggleModulo(g.modulo)}
                  >
                    <i className={`bi ${iconoModulo(g.modulo)}`} aria-hidden="true"></i>
                    <span className="user-menu-grupo-nombre">{g.modulo}</span>
                    <span className="user-menu-grupo-count">{g.acciones.length}</span>
                    <i
                      className={`bi ${expandido ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                      aria-hidden="true"
                    ></i>
                  </button>
                  {expandido && (
                    <ul id={`perm-${g.modulo}`} className="user-menu-acciones">
                      {g.acciones.map((a) => (
                        <li key={a}>
                          <span>{a.replace(/\./g, ' · ')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="user-menu-hint">Sin permisos asignados.</p>
        )}
        <div className="user-menu-hint">
          Tus datos de acceso se derivan de tu sesión. Para cambios de rol o permisos contacta a un administrador.
        </div>
      </Modal>

      <Modal
        show={verPassword}
        onClose={() => setVerPassword(false)}
        title="Cambiar contraseña"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVerPassword(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGuardarPassword} loading={guardando}>
              Guardar
            </Button>
          </>
        }
      >
        <form onSubmit={handleGuardarPassword}>
          {errorPwd && (
            <Alert tone="error" icon="bi-exclamation-triangle">
              {errorPwd}
            </Alert>
          )}
          {okPwd && (
            <Alert tone="success" icon="bi-check-circle">
              {okPwd}
            </Alert>
          )}
          <Input
            label="Nueva contraseña"
            name="nueva-password"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            hint="Mínimo 8 caracteres."
          />
          <Input
            label="Confirmar contraseña"
            name="confirmar-password"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
