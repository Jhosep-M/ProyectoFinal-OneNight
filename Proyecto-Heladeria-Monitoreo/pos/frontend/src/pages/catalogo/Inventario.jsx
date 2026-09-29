import { useEffect, useState } from 'react';
import { inventarioService, proveedoresService } from '../../services/inventarioService.js';
<<<<<<< HEAD
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
=======
>>>>>>> origin/feature/Airton-auxilio

export default function Inventario() {
  const [insumos, setInsumos] = useState([]);
  const [movs, setMovs] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', unidad_medida: '', stock: 0, stock_minimo: 0 });
  const [mov, setMov] = useState({ tipo: 'ingreso', cantidad: '', motivo: '' });
  const [sel, setSel] = useState('');

  const load = () => {
    inventarioService.insumos().then(setInsumos).catch((e) => setError(e.message));
    inventarioService.movimientos().then(setMovs).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); }, []);

  const create = async (ev) => {
    ev.preventDefault();
    try {
      await inventarioService.crearInsumo({ ...form, stock: Number(form.stock), stock_minimo: Number(form.stock_minimo) });
      setForm({ nombre: '', unidad_medida: '', stock: 0, stock_minimo: 0 });
      load();
    } catch (e) { setError(e.message); }
  };

  const movimiento = async (ev) => {
    ev.preventDefault();
    try {
      await inventarioService.movimiento({ insumo_id: sel, tipo: mov.tipo, cantidad: Number(mov.cantidad), motivo: mov.motivo || null });
      setMov({ tipo: 'ingreso', cantidad: '', motivo: '' });
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <h2>Insumos e inventario</h2>
      {error && <p role="alert">{error}</p>}
<<<<<<< HEAD
      <RequirePermiso permiso="inventario.movimiento">
        <form onSubmit={create}>
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input placeholder="Unidad (g, u, litros)" value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} required />
          <button type="submit">Crear insumo</button>
        </form>
        <form onSubmit={movimiento}>
          <select value={sel} onChange={(e) => setSel(e.target.value)} required>
            <option value="">Insumo…</option>
            {insumos.map((i) => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.stock})</option>)}
          </select>
          <select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}>
            <option value="ingreso">Ingreso</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste</option>
          </select>
          <input placeholder="Cantidad" type="number" step="any" min="0.0001" value={mov.cantidad} onChange={(e) => setMov({ ...mov, cantidad: e.target.value })} required />
          <button type="submit">Registrar movimiento</button>
        </form>
      </RequirePermiso>
=======
      <form onSubmit={create}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <input placeholder="Unidad (g, u, litros)" value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} required />
        <button type="submit">Crear insumo</button>
      </form>
      <form onSubmit={movimiento}>
        <select value={sel} onChange={(e) => setSel(e.target.value)} required>
          <option value="">Insumo…</option>
          {insumos.map((i) => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.stock})</option>)}
        </select>
        <select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}>
          <option value="ingreso">Ingreso</option>
          <option value="salida">Salida</option>
          <option value="ajuste">Ajuste</option>
        </select>
        <input placeholder="Cantidad" type="number" step="any" min="0.0001" value={mov.cantidad} onChange={(e) => setMov({ ...mov, cantidad: e.target.value })} required />
        <button type="submit">Registrar movimiento</button>
      </form>
>>>>>>> origin/feature/Airton-auxilio
      <ul>{movs.map((m) => <li key={m.id_movimiento}>{m.tipo} {m.cantidad} — {m.motivo || ''}</li>)}</ul>
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
<<<<<<< HEAD
      <RequirePermiso permiso="inventario.movimiento">
        <form onSubmit={create}>
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input placeholder="NIT (único)" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
          <button type="submit">Crear</button>
        </form>
      </RequirePermiso>
=======
      <form onSubmit={create}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <input placeholder="NIT (único)" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
        <button type="submit">Crear</button>
      </form>
>>>>>>> origin/feature/Airton-auxilio
      <ul>{items.map((p) => <li key={p.id_proveedor}>{p.nombre} — {p.nit || 's/n'} — {p.estado}</li>)}</ul>
    </div>
  );
}
