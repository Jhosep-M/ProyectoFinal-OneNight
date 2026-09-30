import { useEffect, useRef, useState } from 'react';
import { productosService, categoriasService } from '../../services/productosService.js';
import { supabase } from '../../services/api.js';
import { resolveProductoImagen } from '../../utils/productoImagen.js';
import { formatCurrency } from '../../utils/format.js';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';

const empty = { nombre: '', precio: '', stock: 0, stock_minimo: 0, categoria_id: '', imagen_url: '' };

export default function Productos() {
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [archivoSel, setArchivoSel] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const uploadCtrl = useRef(null);
  // Generación de subida: solo la subida vigente puede tocar alert/form.
  // Así una subida vieja que termine tarde jamás pisa un "cancelada".
  const uploadSeq = useRef(0);

  const resetInputArchivo = () => {
    setArchivoSel('');
    setFileKey((k) => k + 1);
  };
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(empty);

  const recargar = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        productosService.list(),
        categoriasService.list().catch(() => []),
      ]);
      setItems(prods || []);
      setCategorias(cats || []);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { recargar(); }, []);

  const subirFoto = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAlert({ tone: 'error', message: 'La imagen supera 5 MB. Elige una más liviana.' });
      resetInputArchivo();
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAlert({ tone: 'error', message: 'El archivo debe ser una imagen.' });
      resetInputArchivo();
      return;
    }
    setAlert(null);
    setSubiendo(true);
    setArchivoSel(file.name);
    const ctrl = new AbortController();
    uploadCtrl.current = ctrl;
    const seq = ++uploadSeq.current;
    const esVigente = () => seq === uploadSeq.current && !ctrl.signal.aborted;
    // Timeout de seguridad: si Supabase no responde en 30 s, se aborta
    // y la UI se desbloquea en vez de quedarse colgada.
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        ctrl.abort();
        const err = new Error('La subida tardó demasiado (30 s) y se canceló. Revisa tu conexión o el bucket "productos".');
        err.isTimeout = true;
        reject(err);
      }, 30000);
    });
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 4);
      const nombreArchivo = `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-') || `foto.${ext}`}`;
      const uploadPromise = supabase.storage.from('productos').upload(nombreArchivo, file, { upsert: false });
      const { error: upError } = await Promise.race([uploadPromise, timeoutPromise]);
      if (!esVigente()) return; // se canceló o fue superada: no tocar alert/form
      if (upError) throw upError;
      setForm((f) => ({ ...f, imagen_url: nombreArchivo }));
      setAlert({ tone: 'success', message: 'Foto subida. Guarda el producto para aplicar el cambio.' });
    } catch (e) {
      if (e?.isTimeout) {
        setAlert({ tone: 'error', message: e.message });
        return;
      }
      if (!esVigente()) return; // cancelada por el usuario: el mensaje ya lo puso cancelarSubida
      setAlert({ tone: 'error', message: `No se pudo subir la foto: ${e.message}` });
    } finally {
      clearTimeout(timeoutId);
      if (uploadCtrl.current === ctrl) uploadCtrl.current = null;
      if (seq === uploadSeq.current) setSubiendo(false);
    }
  };

  const cancelarSubida = () => {
    uploadSeq.current++; // invalida la subida en vuelo: su resultado tardío se ignora
    uploadCtrl.current?.abort();
    uploadCtrl.current = null;
    setSubiendo(false);
    resetInputArchivo();
    setAlert({ tone: 'info', message: 'Subida cancelada. Puedes elegir otro archivo o pegar una URL.' });
  };

  const quitarFoto = () => {
    if (subiendo) {
      cancelarSubida();
      setForm((f) => ({ ...f, imagen_url: '' }));
      return;
    }
    setForm((f) => ({ ...f, imagen_url: '' }));
    resetInputArchivo();
    setAlert(null); // limpia el verde de "Foto subida" para que no quede pegado
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    setAlert(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        precio: Number(form.precio),
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        categoria_id: form.categoria_id || null,
        imagen_url: form.imagen_url || null,
      };
      if (editando) {
        await productosService.update(editando, payload);
        setAlert({ tone: 'success', message: 'Producto actualizado' });
      } else {
        await productosService.create(payload);
        setAlert({ tone: 'success', message: 'Producto creado' });
      }
      setForm(empty);
      setEditando(null);
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const editar = (p) => {
    setEditando(p.id_producto);
    setForm({
      nombre: p.nombre || '',
      precio: p.precio ?? '',
      stock: p.stock ?? 0,
      stock_minimo: p.stock_minimo ?? 0,
      categoria_id: p.categoria_id || '',
      imagen_url: p.imagen_url || '',
    });
    setAlert(null);
  };

  const cancelar = () => { setEditando(null); setForm(empty); };

  const inactivate = async (id) => {
    try {
      await productosService.inactivate(id);
      setAlert({ tone: 'success', message: 'Producto inactivado' });
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const filtrados = items.filter((p) =>
    !busqueda.trim() || (p.nombre || '').toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  const preview = form.imagen_url ? resolveProductoImagen(form) : null;

  return (
    <div>
      <h1>Productos</h1>
      <p className="text-muted">Precios en Bs, IVA incluido.</p>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <RequirePermiso permiso="producto.gestionar">
        <Card title={editando ? 'Editar producto' : 'Nuevo producto'}>
          <form onSubmit={guardar}>
            <div className="row-inline">
              <Input label="Nombre" placeholder="Ej. Cono Simple" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              <Input label="Precio (Bs, IVA incluido)" placeholder="12,00" type="number" step="0.01" min="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required style={{ width: 160 }} />
              <Select label="Categoría" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </Select>
            </div>
            <div className="row-inline">
              <Input label="Stock" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ width: 120 }} />
              <Input label="Stock mínimo" type="number" min={0} value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} style={{ width: 140 }} />
              <Input label="Foto (Storage o URL)" placeholder="cono-simple.jpg o https://…" value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} />
            </div>
            <div className="row-inline">
              <label>Subir foto:{' '}
                <input
                  key={fileKey}
                  type="file"
                  className="input"
                  accept="image/*"
                  aria-label="Subir foto"
                  onChange={(e) => subirFoto(e.target.files?.[0])}
                  disabled={subiendo}
                />
              </label>
              {subiendo && (
                <>
                  <span className="text-muted">Subiendo {archivoSel || '…'} (máx. 30 s)…</span>
                  <Button type="button" variant="secondary" size="sm" onClick={cancelarSubida}>Cancelar subida</Button>
                </>
              )}
              {preview && !subiendo && (
                <>
                  <img src={preview} alt="Vista previa" style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: 6 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <Button type="button" variant="ghost" size="sm" onClick={quitarFoto}>Quitar</Button>
                </>
              )}
              <Button type="submit" loading={subiendo} disabled={subiendo}>{editando ? 'Guardar' : 'Crear'}</Button>
              {editando && !subiendo && <Button type="button" variant="secondary" onClick={cancelar}>Cancelar</Button>}
            </div>
          </form>
        </Card>
      </RequirePermiso>

      <Card
        title="Productos"
        actions={(
          <Input placeholder="Buscar por nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar productos" style={{ width: 220 }} />
        )}
      >
        {loading ? (
          <div className="d-flex flex-column gap-2">
            <Skeleton height={36} />
            <Skeleton height={36} />
            <Skeleton height={36} />
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            title={busqueda ? 'Sin resultados' : 'Sin productos'}
            description={busqueda ? 'Prueba con otro nombre.' : 'Crea el primer producto con el formulario de arriba.'}
          />
        ) : (
          <table className="data-table">
            <thead><tr><th>Foto</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtrados.map((p) => {
                const bajo = Number(p.stock) <= Number(p.stock_minimo);
                const img = resolveProductoImagen(p);
                return (
                  <tr key={p.id_producto}>
                    <td>
                      {img
                        ? <img src={img} alt={p.nombre} style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: 6 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        : <span aria-hidden="true"><i className="bi bi-image text-muted"></i></span>}
                    </td>
                    <td>{p.nombre}</td>
                    <td>{p.categoria || '—'}</td>
                    <td>{formatCurrency(Number(p.precio) || 0)}</td>
                    <td>
                      {p.stock}{' '}
                      {bajo && <Badge tone="warning">Stock bajo</Badge>}
                    </td>
                    <td><Badge tone={p.estado === 'activo' || !p.estado ? 'success' : 'neutral'}>{p.estado || 'activo'}</Badge></td>
                    <td>
                      <RequirePermiso permiso="producto.gestionar">
                        <Button size="sm" variant="secondary" onClick={() => editar(p)}>Editar</Button>{' '}
                        <Button size="sm" variant="ghost" onClick={() => inactivate(p.id_producto)}>Inactivar</Button>
                      </RequirePermiso>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function Categorias() {
  const [items, setItems] = useState([]);
  const [nombre, setNombre] = useState('');
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setItems(await categoriasService.list()); }
    catch (e) { setAlert({ tone: 'error', message: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const create = async (ev) => {
    ev.preventDefault();
    setAlert(null);
    try {
      await categoriasService.create({ nombre: nombre.trim() });
      setNombre('');
      setAlert({ tone: 'success', message: 'Categoría creada' });
      load();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };
  return (
    <div>
      <h1>Categorías</h1>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}
      <RequirePermiso permiso="producto.gestionar">
        <Card title="Nueva categoría">
          <form onSubmit={create}>
            <div className="row-inline">
              <Input label="Nombre" placeholder="Nombre (único)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              <Button type="submit">Crear</Button>
            </div>
          </form>
        </Card>
      </RequirePermiso>
      <Card title="Categorías">
        {loading ? (
          <div className="d-flex flex-column gap-2"><Skeleton height={32} /><Skeleton height={32} /></div>
        ) : items.length === 0 ? (
          <EmptyState title="Sin categorías" description="Crea la primera categoría con el formulario de arriba." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Estado</th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id_categoria}>
                  <td>{c.nombre}</td>
                  <td><Badge tone={c.estado === 'activo' ? 'success' : 'neutral'}>{c.estado}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
