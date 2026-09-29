import { useEffect, useState } from 'react';
import { listarClientes, verCliente, crearCliente, actualizarCliente } from '../../services/customersService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';

const empty = { nombre: '', telefono: '', correo: '', puntos_fidelidad: 0, estado: 'activo' };

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [alert, setAlert] = useState(null);

  const recargar = async () => {
    setLoading(true);
    try { setClientes(await listarClientes()); }
    catch (e) { setAlert({ tone: 'error', message: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { recargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      if (editando) {
        await actualizarCliente(editando, form);
        setAlert({ tone: 'success', message: 'Cliente actualizado' });
      } else {
        await crearCliente(form);
        setAlert({ tone: 'success', message: 'Cliente creado' });
      }
      setForm(empty);
      setEditando(null);
      recargar();
    } catch (e2) { setAlert({ tone: 'error', message: e2.message }); }
  };

  const editar = (c) => {
    setEditando(c.id_cliente);
    setForm({ nombre: c.nombre, telefono: c.telefono || '', correo: c.correo || '', puntos_fidelidad: c.puntos_fidelidad || 0, estado: c.estado });
  };

  const ver = async (id) => {
    try { setDetalle(await verCliente(id)); } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const cancelar = () => { setEditando(null); setForm(empty); };

  return (
    <div>
      <h1>Clientes y puntos</h1>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <RequirePermiso permiso="cliente.gestionar">
        <Card title={editando ? 'Editar cliente' : 'Nuevo cliente'}>
          <form onSubmit={guardar}>
            <div className="row">
              <Input placeholder="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              <Input placeholder="teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              <Input placeholder="correo" type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
            </div>
            <div className="row">
              <Input type="number" min={0} placeholder="puntos" value={form.puntos_fidelidad} onChange={(e) => setForm({ ...form, puntos_fidelidad: e.target.value })} style={{ width: 90 }} />
              <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </Select>
              <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
              {editando && <Button type="button" variant="secondary" onClick={cancelar}>Cancelar</Button>}
            </div>
          </form>
        </Card>
      </RequirePermiso>

      <Card title="Clientes">
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Puntos</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id_cliente}>
                  <td>{c.nombre}</td>
                  <td>{c.telefono || '—'}</td>
                  <td>{c.correo || '—'}</td>
                  <td>{c.puntos_fidelidad}</td>
                  <td><Badge tone={c.estado === 'activo' ? 'success' : 'neutral'}>{c.estado}</Badge></td>
                  <td>
                    <Button size="sm" variant="ghost" onClick={() => ver(c.id_cliente)}>Ver</Button>{' '}
                    <RequirePermiso permiso="cliente.gestionar">
                      <Button size="sm" variant="secondary" onClick={() => editar(c)}>Editar</Button>
                    </RequirePermiso>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {detalle && (
        <Card title={`Detalle: ${detalle.nombre}`}>
          <p>Puntos: {detalle.puntos_fidelidad}</p>
          <h4>Movimientos de puntos</h4>
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Puntos</th><th>Motivo</th></tr></thead>
            <tbody>
              {(detalle.movimientos_puntos || []).map((m) => (
                <tr key={m.id_movimiento}>
                  <td>{new Date(m.fecha).toLocaleString()}</td>
                  <td>{m.tipo}</td>
                  <td>{m.puntos}</td>
                  <td>{m.motivo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
