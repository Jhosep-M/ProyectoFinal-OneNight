import { useEffect, useState } from 'react';
import { productosService, categoriasService } from '../../services/productosService.js';
<<<<<<< HEAD
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
=======
>>>>>>> origin/feature/Airton-auxilio

export default function Productos() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', precio: '', stock: 0, stock_minimo: 0 });

  const load = () => productosService.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async (ev) => {
    ev.preventDefault();
    setError('');
    try {
      await productosService.create({ ...form, precio: Number(form.precio), stock: Number(form.stock), stock_minimo: Number(form.stock_minimo) });
      setForm({ nombre: '', precio: '', stock: 0, stock_minimo: 0 });
      load();
    } catch (e) { setError(e.message); }
  };

  const inactivate = (id) => productosService.inactivate(id).then(load).catch((e) => setError(e.message));

  return (
    <div>
      <h2>Productos</h2>
      {error && <p role="alert">{error}</p>}
<<<<<<< HEAD
      <RequirePermiso permiso="producto.gestionar">
        <form onSubmit={create}>
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input placeholder="Precio" type="number" step="0.01" min="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
          <input placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <input placeholder="Stock mínimo" type="number" min="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
          <button type="submit">Crear</button>
        </form>
      </RequirePermiso>
      <ul>
        {items.map((p) => (
          <li key={p.id_producto}>{p.nombre} — {p.precio} — stock {p.stock}{Number(p.stock) <= Number(p.stock_minimo) ? ' (BAJO)' : ''} <RequirePermiso permiso="producto.gestionar"><button onClick={() => inactivate(p.id_producto)}>Inactivar</button></RequirePermiso></li>
=======
      <form onSubmit={create}>
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <input placeholder="Precio" type="number" step="0.01" min="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
        <input placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <input placeholder="Stock mínimo" type="number" min="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
        <button type="submit">Crear</button>
      </form>
      <ul>
        {items.map((p) => (
          <li key={p.id_producto}>{p.nombre} — {p.precio} — stock {p.stock}{Number(p.stock) <= Number(p.stock_minimo) ? ' (BAJO)' : ''} <button onClick={() => inactivate(p.id_producto)}>Inactivar</button></li>
>>>>>>> origin/feature/Airton-auxilio
        ))}
      </ul>
    </div>
  );
}

export function Categorias() {
  const [items, setItems] = useState([]);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const load = () => categoriasService.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const create = async (ev) => {
    ev.preventDefault();
    try { await categoriasService.create({ nombre }); setNombre(''); load(); }
    catch (e) { setError(e.message); }
  };
  return (
    <div>
      <h2>Categorías</h2>
      {error && <p role="alert">{error}</p>}
<<<<<<< HEAD
      <RequirePermiso permiso="producto.gestionar">
        <form onSubmit={create}>
          <input placeholder="Nombre (único)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <button type="submit">Crear</button>
        </form>
      </RequirePermiso>
=======
      <form onSubmit={create}>
        <input placeholder="Nombre (único)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <button type="submit">Crear</button>
      </form>
>>>>>>> origin/feature/Airton-auxilio
      <ul>{items.map((c) => <li key={c.id_categoria}>{c.nombre} — {c.estado}</li>)}</ul>
    </div>
  );
}
