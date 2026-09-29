import { useEffect, useState } from 'react';
import { listarUsuarios, crearUsuario, actualizarUsuario } from '../../services/usersService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';

const empty = { nombre: '', email: '', rol_id: '', estado: 'activo' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editando, setEditando] = useState(null);
  const [alert, setAlert] = useState(null);

  const recargar = async () => {
    setLoading(true);
    try { setUsuarios(await listarUsuarios()); }
    catch (e) { setAlert({ tone: 'error', message: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { recargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      if (editando) {
        await actualizarUsuario(editando, form);
        setAlert({ tone: 'success', message: 'Usuario actualizado' });
      } else {
        await crearUsuario(form);
        setAlert({ tone: 'success', message: 'Usuario creado' });
      }
      setForm(empty);
      setEditando(null);
      recargar();
    } catch (e2) { setAlert({ tone: 'error', message: e2.message }); }
  };

  const editar = (u) => {
    setEditando(u.id_usuario);
    setForm({ nombre: u.nombre, email: u.email, rol_id: u.rol_id || '', estado: u.estado });
  };

  const cancelar = () => { setEditando(null); setForm(empty); };

  return (
    <div>
      <h1>Usuarios</h1>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <Card title={editando ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={guardar}>
          <div className="row">
            <Input placeholder="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <Input placeholder="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="row">
            <Input placeholder="rol_id (UUID, opcional)" value={form.rol_id} onChange={(e) => setForm({ ...form, rol_id: e.target.value })} />
            <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="activo">activo</option>
              <option value="inactivo">inactivo</option>
            </Select>
            <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
            {editando && <Button type="button" variant="secondary" onClick={cancelar}>Cancelar</Button>}
          </div>
        </form>
      </Card>

      <Card title="Usuarios">
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{u.rol_id || '—'}</td>
                  <td><Badge tone={u.estado === 'activo' ? 'success' : 'neutral'}>{u.estado}</Badge></td>
                  <td><Button size="sm" variant="secondary" onClick={() => editar(u)}>Editar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
