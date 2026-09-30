import { useEffect, useState } from 'react';
import { listarClientes, verCliente, verVentasCliente, crearCliente, actualizarCliente } from '../../services/customersService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
import DetalleCliente from '../../components/clientes/DetalleCliente.jsx';
import AjustePuntosModal from '../../components/clientes/AjustePuntosModal.jsx';

const empty = { nombre: '', telefono: '', correo: '', puntos_fidelidad: 0, estado: 'activo' };

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [ajusteCliente, setAjusteCliente] = useState(null);
  const [alert, setAlert] = useState(null);
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const recargar = async () => {
    setLoading(true);
    try {
      const params = { limit: 20, offset: 0 };
      if (q) params.q = q;
      if (filtroEstado) params.estado = filtroEstado;
      const data = await listarClientes(params);
      setClientes(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => { recargar(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filtroEstado]);

  const normalizar = (v) => {
    const t = (v ?? '').trim();
    return t === '' ? null : t;
  };

  const guardar = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: normalizar(form.telefono),
        correo: normalizar(form.correo),
        estado: form.estado,
      };
      if (editando) {
        await actualizarCliente(editando, payload);
        setAlert({ tone: 'success', message: 'Cliente actualizado' });
      } else {
        await crearCliente(payload);
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
    try {
      const [d, v] = await Promise.all([
        verCliente(id),
        Promise.resolve(verVentasCliente(id)).catch(() => []),
      ]);
      setDetalle(d);
      setVentas(Array.isArray(v) ? v : (v?.data ?? v?.items ?? []));
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const trasAjuste = async () => {
    const id = ajusteCliente?.id_cliente ?? detalle?.id_cliente;
    setAjusteCliente(null);
    await recargar();
    if (id) await ver(id);
  };

  const cancelar = () => { setEditando(null); setForm(empty); };

  return (
    <div>
      <h1>Clientes y puntos</h1>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <RequirePermiso permiso="cliente.gestionar">
        <Card title={editando ? 'Editar cliente' : 'Nuevo cliente'}>
          <form onSubmit={guardar}>
            <div className="row-inline">
              <Input label="Nombre" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              <Input label="Teléfono" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              <Input label="Correo" placeholder="Correo" type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
            </div>
            <div className="row-inline">
              {editando && <p>Puntos actuales: {form.puntos_fidelidad}</p>}
              <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
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
        <div className="row-inline">
          <Input label="Buscar" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select label="Filtrar por estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="activo">activo</option>
            <option value="inactivo">inactivo</option>
          </Select>
          <Button type="button" variant="secondary" onClick={recargar}>Recargar</Button>
        </div>
        {loading ? (
          <p>Cargando…</p>
        ) : clientes.length === 0 ? (
          <p>Sin clientes — crea el primero</p>
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
                      <Button size="sm" variant="secondary" onClick={() => editar(c)}>Editar</Button>{' '}
                      <Button size="sm" variant="secondary" onClick={() => setAjusteCliente(c)}>Ajustar</Button>
                    </RequirePermiso>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {detalle && (
        <DetalleCliente detalle={detalle} ventas={ventas} onClose={() => { setDetalle(null); setVentas([]); }} />
      )}

      {ajusteCliente && (
        <AjustePuntosModal cliente={ajusteCliente} onClose={() => setAjusteCliente(null)} onDone={trasAjuste} />
      )}
    </div>
  );
}
