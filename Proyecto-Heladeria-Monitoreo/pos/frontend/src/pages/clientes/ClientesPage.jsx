import { useEffect, useState } from 'react';
import { listarClientes, verCliente, verVentasCliente, crearCliente, actualizarCliente, eliminarCliente } from '../../services/customersService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
import DetalleCliente from '../../components/clientes/DetalleCliente.jsx';
import AjustePuntosModal from '../../components/clientes/AjustePuntosModal.jsx';

const empty = { nombre: '', telefono: '', correo: '', puntos_fidelidad: 0, estado: 'activo' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const guardar = async (e) => {
    e.preventDefault();
    setAlert(null);
    const tel = (form.telefono ?? '').trim();
    const correo = (form.correo ?? '').trim();
    if (!/^[0-9]{8}$/.test(tel)) {
      setAlert({ tone: 'error', message: 'Teléfono debe tener exactamente 8 dígitos' });
      return;
    }
    if (!EMAIL_RE.test(correo)) {
      setAlert({ tone: 'error', message: 'Correo electrónico obligatorio y válido' });
      return;
    }
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: tel,
        correo,
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
  const fmtPuntos = (v) => String(Math.trunc(Number(v ?? 0)));

  const eliminar = async (c) => {
    if (!window.confirm(`¿Inactivar a ${c.nombre}? Se oculta del listado pero se conserva su historial.`)) return;
    setAlert(null);
    try {
      await eliminarCliente(c.id_cliente);
      setAlert({ tone: 'success', message: 'Cliente inactivado' });
      if (editando === c.id_cliente) { setEditando(null); setForm(empty); }
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes y puntos</h1>
          <p className="field-hint">Cada Bs 30 de compra = 1 punto. Teléfono (8 dígitos) y correo obligatorios.</p>
        </div>
        <Button type="button" variant="secondary" onClick={recargar}>Recargar</Button>
      </div>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <RequirePermiso permisos={['cliente.crear', 'cliente.gestionar']}>
        <Card
          title={editando ? 'Editar cliente' : 'Nuevo cliente'}
          actions={editando ? <span className="badge badge-info">Puntos: {fmtPuntos(form.puntos_fidelidad)}</span> : null}
        >
          <form onSubmit={guardar}>
            <div className="field-row field-row--3">
              <Input label="Nombre" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              <Input label="Teléfono (8 dígitos)" placeholder="Ej. 71098016" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 8) })} required pattern="[0-9]{8}" maxLength={8} inputMode="numeric" title="8 dígitos numéricos" />
              <Input label="Correo electrónico" placeholder="cliente@correo.com" type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required />
            </div>
            <div className="form-footer">
              <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </Select>
              <div className="form-footer__actions">
                <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
                {editando && <Button type="button" variant="secondary" onClick={cancelar}>Cancelar</Button>}
              </div>
            </div>
          </form>
        </Card>
      </RequirePermiso>

      <Card
        title="Clientes"
        actions={<span className="field-hint">{loading ? '' : `${clientes.length} registro(s)`}</span>}
      >
        <div className="table-toolbar">
          <div className="table-toolbar__filters filters-grid">
            <Input label="Buscar" placeholder="Nombre, teléfono o correo…" value={q} onChange={(e) => setQ(e.target.value)} className="table-toolbar__search" />
            <Select label="Estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="activo">activo</option>
              <option value="inactivo">inactivo</option>
            </Select>
          </div>
        </div>
        {loading ? (
          <div className="skeleton-list">
            <Skeleton height={36} />
            <Skeleton height={36} />
            <Skeleton height={36} />
          </div>
        ) : clientes.length === 0 ? (
          <EmptyState title="Sin clientes" description="Crea el primero con teléfono de 8 dígitos y correo válido." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th className="numeric">Puntos</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id_cliente}>
                    <td><strong>{c.nombre}</strong></td>
                    <td className="numeric">{c.telefono || '—'}</td>
                    <td>{c.correo || '—'}</td>
                    <td className="numeric">{fmtPuntos(c.puntos_fidelidad)}</td>
                    <td><Badge tone={c.estado === 'activo' ? 'success' : 'neutral'}>{c.estado}</Badge></td>
                    <td>
                      <div className="row-actions">
                        <Button size="sm" variant="secondary" onClick={() => ver(c.id_cliente)}>Ver</Button>
                        <RequirePermiso permiso="cliente.gestionar" fallback={null}>
                          <Button size="sm" variant="secondary" onClick={() => editar(c)}>Editar</Button>
                        </RequirePermiso>
                        <RequirePermiso permisos={['cliente.puntos', 'cliente.gestionar']} fallback={null}>
                          <Button size="sm" variant="primary" onClick={() => setAjusteCliente(c)}>Ajustar</Button>
                        </RequirePermiso>
                        <RequirePermiso permiso="cliente.gestionar" fallback={null}>
                          {c.estado === 'activo' && (
                            <Button size="sm" variant="danger" onClick={() => eliminar(c)}>Eliminar</Button>
                          )}
                        </RequirePermiso>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
