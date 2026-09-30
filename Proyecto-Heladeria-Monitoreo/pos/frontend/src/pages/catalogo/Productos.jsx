import { useEffect, useState } from 'react';
import { productosService, categoriasService } from '../../services/productosService.js';
import { supabase } from '../../services/api.js';
import { resolveProductoImagen } from '../../utils/productoImagen.js';
import { formatCurrency } from '../../utils/format.js';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';

export default function Productos() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [form, setForm] = useState({ nombre: '', precio: '', stock: 0, stock_minimo: 0, imagen_url: '' });

  const load = () => productosService.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const subirFoto = async (file) => {
    if (!file) return;
    setError('');
    setSubiendo(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 4);
      const nombreArchivo = `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-') || `foto.${ext}`}`;
      const { error: upError } = await supabase.storage.from('productos').upload(nombreArchivo, file, { upsert: false });
      if (upError) throw upError;
      setForm((f) => ({ ...f, imagen_url: nombreArchivo }));
    } catch (e) {
      setError(`No se pudo subir la foto: ${e.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  const create = async (ev) => {
    ev.preventDefault();
    setError('');
    try {
      await productosService.create({
        ...form,
        precio: Number(form.precio),
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        imagen_url: form.imagen_url || null,
      });
      setForm({ nombre: '', precio: '', stock: 0, stock_minimo: 0, imagen_url: '' });
      load();
    } catch (e) { setError(e.message); }
  };

  const inactivate = (id) => productosService.inactivate(id).then(load).catch((e) => setError(e.message));

  return (
    <div>
      <h2>Productos (Bs, IVA incluido)</h2>
      {error && <p role="alert">{error}</p>}
      <RequirePermiso permiso="producto.gestionar">
        <form onSubmit={create} className="d-flex flex-column gap-2 mb-3" style={{ maxWidth: '420px' }}>
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input placeholder="Precio en Bs (con IVA incluido)" type="number" step="0.01" min="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
          <input placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <input placeholder="Stock mínimo" type="number" min="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
          <input placeholder="Foto: nombre en Storage o URL (ej. cono-simple.jpg)" value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} />
          <input type="file" accept="image/*" aria-label="Subir foto" onChange={(e) => subirFoto(e.target.files?.[0])} disabled={subiendo} />
          {form.imagen_url && resolveProductoImagen(form) && (
            <img src={resolveProductoImagen(form)} alt="Vista previa" style={{ width: '120px', height: '90px', objectFit: 'cover' }} />
          )}
          <button type="submit" disabled={subiendo}>{subiendo ? 'Subiendo foto...' : 'Crear'}</button>
        </form>
      </RequirePermiso>
      <ul className="list-unstyled d-flex flex-column gap-2">
        {items.map((p) => (
          <li key={p.id_producto} className="d-flex align-items-center gap-2">
            {resolveProductoImagen(p)
              ? <img src={resolveProductoImagen(p)} alt={p.nombre} style={{ width: '48px', height: '36px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              : <span aria-hidden="true"><i className="bi bi-image text-muted"></i></span>}
            <span>{p.nombre} — {formatCurrency(Number(p.precio) || 0)} — stock {p.stock}{Number(p.stock) <= Number(p.stock_minimo) ? ' (BAJO)' : ''}</span>
            <RequirePermiso permiso="producto.gestionar"><button onClick={() => inactivate(p.id_producto)}>Inactivar</button></RequirePermiso>
          </li>
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
      <RequirePermiso permiso="producto.gestionar">
        <form onSubmit={create}>
          <input placeholder="Nombre (único)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <button type="submit">Crear</button>
        </form>
      </RequirePermiso>
      <ul>{items.map((c) => <li key={c.id_categoria}>{c.nombre} — {c.estado}</li>)}</ul>
    </div>
  );
}
