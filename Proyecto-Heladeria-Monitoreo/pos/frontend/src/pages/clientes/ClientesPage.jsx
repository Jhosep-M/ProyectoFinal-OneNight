import { useCallback, useEffect, useState } from 'react';
import { listarClientes, verCliente, verVentasCliente, crearCliente, actualizarCliente, eliminarCliente } from '../../services/customersService.js';
import { useAutoRefresh } from '../../hooks/useAutoRefresh.js';
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
import ConfirmEliminarModal from '../../components/clientes/ConfirmEliminarModal.jsx';

const empty = { nombre: '', telefono: '', correo: '', carnet_identidad: '', puntos_fidelidad: 0, estado: 'activo' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CARNET_RE = /^[0-9]{4,10}([- ][0-9]{1,2}[A-Z])?( (LP|CB|SC|OR|PT|TJ|CH|BE|PD))?$/;
const normalizarCarnet = (v) => String(v ?? '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-');

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [ajusteCliente, setAjusteCliente] = useState(null);
  const [eliminarTarget, setEliminarTarget] = useState(null);
  const [alert, setAlert] = useState(null);
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const params = { limit: 20, offset: 0 };
      if (q) params.q = q;
      if (filtroEstado) params.estado = filtroEstado;
      const data = await listarClientes(params);
      setClientes(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
    } catch (e) {
      // Polling silencioso no borra el alert de éxito de la acción recién hecha
      if (!silencioso) setAlert({ tone: 'error', message: e.message });
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [q, filtroEstado]);

  useEffect(() => {
    const t = setTimeout(() => { recargar(false); }, 300);
    return () => clearTimeout(t);
  }, [recargar]);

  // AGENTS §15.2: polling operativo 30s + revalidación en focus, silencioso
  useAutoRefresh(() => recargar(true), { intervalMs: 30000, onFocus: true });

  const guardar = async (e) => {
    e.preventDefault();
    setAlert(null);
    const nombre = (form.nombre ?? '').trim();
    const tel = (form.telefono ?? '').trim();
    const correo = (form.correo ?? '').trim().toLowerCase();
    const carnet = normalizarCarnet(form.carnet_identidad);
    if (!nombre) {
      setAlert({ tone: 'error', message: 'Nombre obligatorio' });
      return;
    }
    if (!/^[0-9]{8}$/.test(tel)) {
      setAlert({ tone: 'error', message: 'Teléfono debe tener exactamente 8 dígitos' });
      return;
    }
    if (!EMAIL_RE.test(correo)) {
      setAlert({ tone: 'error', message: 'Correo electrónico obligatorio y válido' });
      return;
    }
    if (!CARNET_RE.test(carnet)) {
      setAlert({ tone: 'error', message: 'Carnet inválido. Ej. 1234567, 1234567 LP, 1234567-1A LP' });
      return;
    }
    // Pre-chequeo local: correo, teléfono y carnet únicos (nombre puede repetirse).
    // El backend es la autoridad final (409), esto solo evita el viaje.
    const otro = clientes.find((c) => {
      if (editando && c.id_cliente === editando) return false;
      const cCorreo = String(c.correo ?? '').trim().toLowerCase();
      const cTel = String(c.telefono ?? '').trim();
      const cCarnet = normalizarCarnet(c.carnet_identidad);
      return (cCorreo && cCorreo === correo) || (cTel && cTel === tel) || (cCarnet && cCarnet === carnet);
    });
    if (otro) {
      const cCorreo = String(otro.correo ?? '').trim().toLowerCase();
      const cTel = String(otro.telefono ?? '').trim();
      const cCarnet = normalizarCarnet(otro.carnet_identidad);
      const msg = cCarnet === carnet ? `Carnet ya registrado (${otro.nombre})` : cCorreo === correo ? `Correo ya registrado (${otro.nombre})` : `Teléfono ya registrado (${otro.nombre})`;
      setAlert({ tone: 'error', message: msg });
      return;
    }
    try {
      const payload = { nombre, telefono: tel, correo, carnet_identidad: carnet, estado: form.estado };
      if (editando) {
        await actualizarCliente(editando, payload);
        setAlert({ tone: 'success', message: 'Cliente actualizado' });
      } else {
        await crearCliente(payload);
        setAlert({ tone: 'success', message: 'Cliente creado' });
      }
      setForm(empty);
      setEditando(null);
      await recargar(false);
    } catch (e2) {
      // No limpiar el form en 409 para que corrija el dato erróneo
      const fields = e2?.payload?.fields;
      const detalleCampos = fields ? Object.values(fields).join('. ') : null;
      setAlert({ tone: 'error', message: detalleCampos || e2.message });
    }
  };

  const editar = (c) => {
    setEditando(c.id_cliente);
    setForm({ nombre: c.nombre, telefono: c.telefono || '', correo: c.correo || '', carnet_identidad: c.carnet_identidad || '', puntos_fidelidad: c.puntos_fidelidad || 0, estado: c.estado });
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

  const confirmarEliminar = async () => {
    const c = eliminarTarget;
    if (!c) return;
    setAlert(null);
    const id = c.id_cliente;
    // Actualización optimista: quitar de la lista de inmediato
    setClientes((prev) => prev.filter((x) => x.id_cliente !== id));
    if (editando === id) { setEditando(null); setForm(empty); }
    if (detalle?.id_cliente === id) { setDetalle(null); setVentas([]); }
    setEliminarTarget(null);
    try {
      await eliminarCliente(id);
      setAlert({ tone: 'success', message: 'Cliente eliminado' });
    } catch (e) {
      const msg = e?.message || 'No se pudo eliminar';
      setAlert({ tone: 'error', message: msg });
    } finally {
      await recargar(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes y puntos</h1>
          <p className="field-hint">Cada Bs 30 de compra = 1 punto. Teléfono (8 dígitos), correo y carnet obligatorios.</p>
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
            <div className="field-row field-row--3">
              <div>
                <Input label="Carnet de identidad (obligatorio)" placeholder="Ej. 1234567-1A LP" value={form.carnet_identidad} onChange={(e) => setForm({ ...form, carnet_identidad: e.target.value.toUpperCase().replace(/[^0-9A-Z \-]/g, '').slice(0, 20) })} required maxLength={20} title="4-10 dígitos + complemento opcional (-1A) + extensión (LP/CB/SC/OR/PT/TJ/CH/BE/PD). Ej. 1234567, 1234567 LP, 1234567-1A LP" />
                <span className="field-hint">Raíz 4-10 dígitos + complemento (-1A) + extensión (LP/CB/SC/OR/PT/TJ/CH/BE/PD).</span>
              </div>
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
            <Input label="Buscar" placeholder="Nombre, teléfono, correo o carnet…" value={q} onChange={(e) => setQ(e.target.value)} className="table-toolbar__search" />
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
          <EmptyState title="Sin clientes" description="Crea el primero con teléfono de 8 dígitos, correo y carnet válidos." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Carnet</th><th className="numeric numeric--center">Puntos</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id_cliente}>
                    <td><strong>{c.nombre}</strong></td>
                    <td className="numeric">{c.telefono || '—'}</td>
                    <td>{c.correo || '—'}</td>
                    <td className="numeric">{c.carnet_identidad || '—'}</td>
                    <td className="numeric numeric--center">{fmtPuntos(c.puntos_fidelidad)}</td>
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
                          <Button size="sm" variant="danger" onClick={() => setEliminarTarget(c)}>Eliminar</Button>
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

      {eliminarTarget && (
        <ConfirmEliminarModal
          cliente={eliminarTarget}
          onCancel={() => setEliminarTarget(null)}
          onConfirm={confirmarEliminar}
        />
      )}
    </div>
  );
}
