import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const userName =
    session?.user?.user_metadata?.name || session?.user?.email || 'Usuario';
  const email = session?.user?.email || '—';

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
        <dl className="user-menu-dl">
          <div>
            <dt>Nombre</dt>
            <dd>{userName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{rol || '—'}</dd>
          </div>
          <div>
            <dt>Permisos</dt>
            <dd>
              {permisos?.length ? (
                <ul className="user-menu-permisos">
                  {permisos.map((p) => (
                    <li key={p}>
                      <code>{p}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
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
