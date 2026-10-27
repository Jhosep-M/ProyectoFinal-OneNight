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
      await recargar(true);
    } catch (e2) { setAlert({ tone: 'error', message: e2.message }); }
  };

  const editar = (u) => {
    setEditando(u.id_usuario);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol || '' });
  };

  const cancelar = () => { setEditando(null); setForm(empty); };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.nombre} (${u.email})? Esta acción no se puede deshacer.`)) return;
    setAlert(null);
    const previo = usuarios;
    setUsuarios((arr) => arr.filter((x) => x.id_usuario !== u.id_usuario));
    try {
      await eliminarUsuario(u.id_usuario);
      setAlert({ tone: 'success', message: 'Usuario eliminado' });
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
          <div className="row-inline">
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
            <Input
              placeholder={editando ? 'nueva contraseña (opcional)' : 'contraseña (mín. 8)'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editando}
              minLength={editando ? undefined : 8}
            />
            <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
            {editando && <Button type="button" variant="secondary" onClick={cancelar}>Cancelar</Button>}
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
