import { useCallback, useEffect, useState } from 'react';
import { listarUsuarios, listarRoles, crearUsuario, actualizarUsuario, eliminarUsuario } from '../../services/usersService.js';
import { useAutoRefresh } from '../../hooks/useAutoRefresh.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';

const empty = { nombre: '', email: '', password: '', rol: '' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editando, setEditando] = useState(null);
  const [verPassword, setVerPassword] = useState(false);
  const [alert, setAlert] = useState(null);

  const recargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [lista, listaRoles] = await Promise.all([
        listarUsuarios(),
        listarRoles().catch(() => []),
      ]);
      setUsuarios(Array.isArray(lista) ? lista : []);
      setRoles(Array.isArray(listaRoles) ? listaRoles : []);
    } catch (e) {
      if (!silent) setAlert({ tone: 'error', message: e.message });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);
  // Polling operativo silencioso (AGENTS §15.2): no borra el alert de la acción.
  useAutoRefresh(() => recargar(true), { intervalMs: 30000, onFocus: true });

  const guardar = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      if (editando) {
        // En edición: nombre/email/rol; contraseña solo si se escribe una nueva.
        const payload = { nombre: form.nombre, email: form.email };
        if (form.rol) payload.rol = form.rol;
        if (form.password) payload.password = form.password;
        const previo = usuarios;
        setUsuarios((arr) => arr.map((u) => (u.id_usuario === editando ? { ...u, ...payload, rol: payload.rol || u.rol } : u)));
        await actualizarUsuario(editando, payload);
        setAlert({ tone: 'success', message: 'Usuario actualizado' });
        void previo;
      } else {
        if (!form.password || form.password.length < 8) {
          setAlert({ tone: 'error', message: 'La contraseña debe tener al menos 8 caracteres' });
          return;
        }
        if (!form.rol) {
          setAlert({ tone: 'error', message: 'Selecciona un rol' });
          return;
        }
        const payload = { nombre: form.nombre, email: form.email, password: form.password, rol: form.rol };
        await crearUsuario(payload);
        setAlert({ tone: 'success', message: 'Usuario creado. Ya puede ingresar con su email y contraseña.' });
      }
      setForm(empty);
      setEditando(null);
      setVerPassword(false);
      await recargar(true);
    } catch (e2) { setAlert({ tone: 'error', message: e2.message }); }
  };

  const editar = (u) => {
    setEditando(u.id_usuario);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol || '' });
  };

  const cancelar = () => { setEditando(null); setForm(empty); setVerPassword(false); };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.nombre} (${u.email})? Desaparecerá de la lista. Si tiene historial, se desactiva en vez de borrarse.`)) return;
    setAlert(null);
    const previo = usuarios;
    setUsuarios((arr) => arr.filter((x) => x.id_usuario !== u.id_usuario));
    try {
      const resp = await eliminarUsuario(u.id_usuario);
      setAlert({ tone: 'success', message: resp?.desactivado ? 'Usuario desactivado y ocultado (tenía historial operativo)' : 'Usuario eliminado de forma permanente' });
      await recargar(true);
    } catch (e) {
      setUsuarios(previo);
      setAlert({ tone: 'error', message: e.message });
    }
  };

  return (
    <div>
      <h1>Usuarios</h1>
      <p className="text-muted">Solo el administrador puede registrar usuarios. Cada usuario recibe su rol y contraseña, y luego él mismo puede cambiarla con un código de verificación.</p>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <Card title={editando ? 'Editar usuario' : 'Nuevo usuario (solo admin)'}>
        <form onSubmit={guardar}>
          <div className="row-inline">
            <Input placeholder="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <Input placeholder="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="row-inline" style={{ alignItems: 'center' }}>
            <Select
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
              required={!editando}
            >
              <option value="">rol…</option>
              {roles.map((r) => (
                <option key={r.id_rol} value={r.nombre}>{r.nombre}</option>
              ))}
            </Select>
            <div style={{ position: 'relative' }}>
              <Input
                placeholder={editando ? 'nueva contraseña (opcional)' : 'contraseña (mín. 8)'}
                type={verPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editando}
                minLength={editando ? undefined : 8}
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verPassword}
                title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setVerPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 12,
                  right: 8,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  color: 'var(--ink-muted)',
                }}
              >
                {verPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <Button type="submit" style={{ alignSelf: 'center', marginBottom: 12 }}>{editando ? 'Guardar' : 'Crear'}</Button>
            {editando && <Button type="button" variant="secondary" onClick={cancelar} style={{ alignSelf: 'center', marginBottom: 12 }}>Cancelar</Button>}
          </div>
        </form>
      </Card>

      <Card title="Usuarios">
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th></th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{u.rol || '—'}</td>
                  <td>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" variant="secondary" onClick={() => editar(u)}>Editar</Button>
                      <Button size="sm" variant="danger" onClick={() => eliminar(u)}>Eliminar</Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
