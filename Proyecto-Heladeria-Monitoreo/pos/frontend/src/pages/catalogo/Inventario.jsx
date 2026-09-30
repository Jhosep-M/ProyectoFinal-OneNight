import { useEffect, useMemo, useState } from 'react';
import { inventarioService, proveedoresService } from '../../services/inventarioService.js';
import { getAlertaInsumo, isStockBajo, isVencido, isPorVencer } from '../../utils/inventario.js';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';

const emptyForm = { nombre: '', unidad_medida: '', stock: '', stock_minimo: '', fecha_vencimiento: '', estado: 'disponible' };

function formatFecha(f) {
  if (!f) return '—';
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatSoloFecha(f) {
  if (!f) return '—';
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Inventario() {
  const [insumos, setInsumos] = useState([]);
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editando, setEditando] = useState(null);
  const [mov, setMov] = useState({ tipo: 'ingreso', cantidad: '', motivo: '' });
  const [sel, setSel] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [ins, mv] = await Promise.all([
        inventarioService.insumos(),
        inventarioService.movimientos().catch(() => []),
      ]);
      setInsumos(ins || []);
      setMovs(mv || []);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const porId = useMemo(() => {
    const m = new Map();
    insumos.forEach((i) => m.set(i.id_insumo, i));
    return m;
  }, [insumos]);

  const selInsumo = porId.get(sel) || null;

  const insumosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const list = !q ? insumos : insumos.filter((i) => (i.nombre || '').toLowerCase().includes(q));
    // Alertados primero: vencido > stock-bajo > por-vencer > resto, luego nombre
    const peso = (i) => {
      const a = getAlertaInsumo(i);
      if (a === 'vencido' || a === 'no_disponible') return 0;
      if (a === 'stock-bajo') return 1;
      if (a === 'por-vencer') return 2;
      return 3;
    };
    return [...list].sort((a, b) => peso(a) - peso(b) || String(a.nombre).localeCompare(String(b.nombre)));
  }, [insumos, busqueda]);

  const movsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movs.filter((m) => {
      if (filtroTipo && m.tipo !== filtroTipo) return false;
      if (!q) return true;
      const ins = porId.get(m.insumo_id);
      return (ins?.nombre || '').toLowerCase().includes(q) || (m.motivo || '').toLowerCase().includes(q);
    });
  }, [movs, busqueda, filtroTipo, porId]);

  const conteoAlertas = useMemo(() => insumos.filter((i) => getAlertaInsumo(i)).length, [insumos]);

  const guardar = async (ev) => {
    ev.preventDefault();
    setAlert(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        unidad_medida: form.unidad_medida.trim(),
        stock_minimo: form.stock_minimo === '' ? 0 : Number(form.stock_minimo),
        fecha_vencimiento: form.fecha_vencimiento || null,
        estado: form.estado || 'disponible',
      };
      if (payload.stock_minimo < 0 || Number.isNaN(payload.stock_minimo)) throw new Error('Stock mínimo inválido');
      if (!editando) {
        payload.stock = form.stock === '' ? 0 : Number(form.stock);
        if (payload.stock < 0 || Number.isNaN(payload.stock)) throw new Error('Stock inicial inválido');
        await inventarioService.crearInsumo(payload);
        setAlert({ tone: 'success', message: 'Insumo creado' });
      } else {
        // Stock solo vía movimientos para mantener trazabilidad
        delete payload.stock;
        await inventarioService.actualizarInsumo(editando, payload);
        setAlert({ tone: 'success', message: 'Insumo actualizado' });
      }
      setForm(emptyForm);
      setEditando(null);
      load();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const editar = (i) => {
    setEditando(i.id_insumo);
    setForm({
      nombre: i.nombre || '',
      unidad_medida: i.unidad_medida || '',
      stock: i.stock ?? '',
      stock_minimo: i.stock_minimo ?? '',
      fecha_vencimiento: i.fecha_vencimiento ? new Date(i.fecha_vencimiento).toISOString().slice(0, 10) : '',
      estado: i.estado || 'disponible',
    });
    setAlert(null);
  };

  const cancelar = () => { setEditando(null); setForm(emptyForm); };

  const movimiento = async (ev) => {
    ev.preventDefault();
    setAlert(null);
    try {
      if (!sel) throw new Error('Elige un insumo');
      const cantidad = Number(mov.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error('Cantidad debe ser > 0');
      if ((mov.tipo === 'salida' || mov.tipo === 'ajuste') && !mov.motivo.trim()) {
        throw new Error('Motivo requerido para salida/ajuste');
      }
      await inventarioService.movimiento({
        insumo_id: sel,
        tipo: mov.tipo,
        cantidad,
        motivo: mov.motivo.trim() || null,
      });
      setAlert({ tone: 'success', message: `Movimiento registrado. Nuevo stock: pendiente de recarga` });
      setMov({ tipo: 'ingreso', cantidad: '', motivo: '' });
      load();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  return (
    <div>
      <h1>Inventario</h1>
      <p className="text-muted">
        Insumos e inventario {conteoAlertas > 0 && <Badge tone="warning">{conteoAlertas} con alerta</Badge>}
      </p>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <RequirePermiso permiso="inventario.movimiento">
        <Card title={editando ? 'Editar insumo' : 'Nuevo insumo'}>
          <form onSubmit={guardar}>
            <div className="row-inline">
              <Input label="Nombre" placeholder="Ej. Leche entera" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              <Input label="Unidad (g, u, litros)" placeholder="litros" value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} required style={{ width: 170 }} />
              <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="disponible">disponible</option>
                <option value="no_disponible">no disponible</option>
                <option value="vencido">vencido</option>
                <option value="inactivo">inactivo</option>
              </Select>
            </div>
            <div className="row-inline">
              {!editando && (
                <Input label="Stock inicial" type="number" step="any" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ width: 140 }} />
              )}
              <Input label="Stock mínimo" type="number" step="any" min={0} value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} style={{ width: 140 }} />
              <Input label="Vencimiento" type="date" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} style={{ width: 170 }} />
              <div className="field" style={{ alignSelf: 'end' }}>
                <Button type="submit">{editando ? 'Guardar' : 'Crear insumo'}</Button>{' '}
                {editando && <Button type="button" variant="secondary" onClick={cancelar}>Cancelar</Button>}
              </div>
            </div>
            {editando && <p className="text-muted">El stock no se edita directo: usa Registrar movimiento para trazabilidad.</p>}
          </form>
        </Card>

        <Card title="Registrar movimiento">
          <form onSubmit={movimiento}>
            <div className="row-inline">
              <Select label="Insumo" value={sel} onChange={(e) => setSel(e.target.value)} required style={{ minWidth: 220 }}>
                <option value="">Insumo…</option>
                {insumos.map((i) => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.stock} {i.unidad_medida || ''})</option>)}
              </Select>
              <Select label="Tipo" value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}>
                <option value="ingreso">Ingreso</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste (fija stock)</option>
              </Select>
              <Input label="Cantidad" placeholder="Cantidad" type="number" step="any" min="0.0001" value={mov.cantidad} onChange={(e) => setMov({ ...mov, cantidad: e.target.value })} required style={{ width: 140 }} />
              <Input label="Motivo" placeholder="Ej. compra, merma, conteo" value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })} style={{ minWidth: 220 }} />
            </div>
            <div className="row-inline">
              <Button type="submit" disabled={!sel || !mov.cantidad}>Registrar movimiento</Button>
              {selInsumo && <span className="text-muted">Stock actual: {selInsumo.stock} {selInsumo.unidad_medida || ''} · mín {selInsumo.stock_minimo ?? 0}</span>}
            </div>
          </form>
        </Card>
      </RequirePermiso>

      <Card
        title="Insumos"
        actions={(
          <Input placeholder="Buscar insumo o motivo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar insumos" style={{ width: 240 }} />
        )}
      >
        {loading ? (
          <div className="d-flex flex-column gap-2"><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></div>
        ) : insumosFiltrados.length === 0 ? (
          <EmptyState title={busqueda ? 'Sin resultados' : 'Sin insumos'} description={busqueda ? 'Prueba con otro nombre.' : 'Crea el primer insumo con el formulario de arriba.'} />
        ) : (
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Unidad</th><th>Stock</th><th>Mín</th><th>Vencimiento</th><th>Estado</th><th>Alerta</th><th></th></tr></thead>
            <tbody>
              {insumosFiltrados.map((i) => {
                const alerta = getAlertaInsumo(i);
                const bajo = isStockBajo(i);
                const venc = isVencido(i) || i.estado === 'vencido';
                const porVencer = isPorVencer(i);
                return (
                  <tr key={i.id_insumo}>
                    <td>{i.nombre}</td>
                    <td>{i.unidad_medida || '—'}</td>
                    <td>{i.stock} {bajo && <Badge tone="warning">Bajo</Badge>}</td>
                    <td>{i.stock_minimo ?? 0}</td>
                    <td>{formatSoloFecha(i.fecha_vencimiento)} {venc ? <Badge tone="error">Vencido</Badge> : porVencer ? <Badge tone="warning">Por vencer</Badge> : null}</td>
                    <td><Badge tone={i.estado === 'disponible' ? 'success' : 'neutral'}>{i.estado || 'disponible'}</Badge></td>
                    <td>{alerta ? <Badge tone={alerta === 'vencido' ? 'error' : 'warning'}>{alerta}</Badge> : <span className="text-muted">—</span>}</td>
                    <td>
                      <RequirePermiso permiso="inventario.movimiento">
                        <Button size="sm" variant="secondary" onClick={() => editar(i)}>Editar</Button>{' '}
                        <Button size="sm" variant="ghost" onClick={() => { setSel(i.id_insumo); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Mover</Button>
                      </RequirePermiso>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        title="Movimientos"
        actions={(
          <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} aria-label="Filtrar por tipo" style={{ width: 150 }}>
            <option value="">Todos</option>
            <option value="ingreso">Ingreso</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste</option>
          </Select>
        )}
      >
        {loading ? (
          <div className="d-flex flex-column gap-2"><Skeleton height={32} /><Skeleton height={32} /></div>
        ) : movsFiltrados.length === 0 ? (
          <EmptyState title="Sin movimientos" description="Registra el primer ingreso con el formulario de arriba." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Insumo</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th></tr></thead>
            <tbody>
              {movsFiltrados.slice(0, 200).map((m) => (
                <tr key={m.id_movimiento}>
                  <td>{formatFecha(m.fecha)}</td>
                  <td>{porId.get(m.insumo_id)?.nombre || (m.producto_id ? `producto ${String(m.producto_id).slice(0, 8)}…` : '—')}</td>
                  <td><Badge tone={m.tipo === 'ingreso' ? 'success' : m.tipo === 'salida' ? 'info' : 'neutral'}>{m.tipo}</Badge> {m.cantidad}</td>
                  <td>{m.cantidad}</td>
                  <td>{m.motivo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function Proveedores() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nombre: '', nit: '' });
  const [error, setError] = useState('');
  const load = () => proveedoresService.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const create = async (ev) => {
    ev.preventDefault();
    try { await proveedoresService.create(form); setForm({ nombre: '', nit: '' }); load(); }
    catch (e) { setError(e.message); }
  };
  return (
    <div>
      <h2>Proveedores</h2>
      {error && <p role="alert">{error}</p>}
      <RequirePermiso permiso="inventario.movimiento">
        <form onSubmit={create}>
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input placeholder="NIT (único)" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
          <button type="submit">Crear</button>
        </form>
      </RequirePermiso>
      <ul>{items.map((p) => <li key={p.id_proveedor}>{p.nombre} — {p.nit || 's/n'} — {p.estado}</li>)}</ul>
    </div>
  );
}
