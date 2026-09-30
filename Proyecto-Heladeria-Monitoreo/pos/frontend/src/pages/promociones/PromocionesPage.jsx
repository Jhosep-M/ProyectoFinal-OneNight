import { useEffect, useState } from 'react';
import { listarPromociones, verPromocion, crearPromocion, actualizarPromocion } from '../../services/promotionsService.js';
import { productosService } from '../../services/productosService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';

const empty = { nombre: '', porcentaje_descuento: 0, fecha_inicio: '', fecha_fin: '', estado: 'activa', producto_ids: [] };

const TONE_ESTADO = { activa: 'success', inactiva: 'neutral', finalizada: 'info' };

export default function PromocionesPage() {
  const [promos, setPromos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editando, setEditando] = useState(null);
  const [alert, setAlert] = useState(null);

  const recargar = async () => {
    setLoading(true);
    try { setPromos(await listarPromociones()); }
    catch (e) { setAlert({ tone: 'error', message: e.message }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    recargar();
    productosService.list().then(setProductos).catch(() => {});
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setAlert(null);
    const payload = {
      ...form,
      porcentaje_descuento: Number(form.porcentaje_descuento),
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
    };
    try {
      if (editando) {
        await actualizarPromocion(editando, payload);
        setAlert({ tone: 'success', message: 'Promoción actualizada' });
      } else {
        await crearPromocion(payload);
        setAlert({ tone: 'success', message: 'Promoción creada' });
      }
      setForm(empty);
      setEditando(null);
      recargar();
    } catch (e2) { setAlert({ tone: 'error', message: e2.message }); }
  };

  const editar = async (p) => {
    try {
      const d = await verPromocion(p.id_promocion);
      setEditando(d.id_promocion);
      setForm({
        nombre: d.nombre,
        porcentaje_descuento: d.porcentaje_descuento,
        fecha_inicio: d.fecha_inicio ? d.fecha_inicio.slice(0, 10) : '',
        fecha_fin: d.fecha_fin ? d.fecha_fin.slice(0, 10) : '',
        estado: d.estado,
        producto_ids: (d.productos || []).map((x) => x.producto_id),
      });
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const toggleProducto = (id) => {
    setForm((f) => ({
      ...f,
      producto_ids: f.producto_ids.includes(id)
        ? f.producto_ids.filter((x) => x !== id)
        : [...f.producto_ids, id],
    }));
  };

  const cancelar = () => { setEditando(null); setForm(empty); };

  return (
    <div>
      <h1>Promociones</h1>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <RequirePermiso permiso="promocion.gestionar">
        <Card title={editando ? 'Editar promoción' : 'Nueva promoción'}>
          <form onSubmit={guardar}>
            <div className="row-inline">
              <Input placeholder="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              <Input type="number" min={0} max={100} placeholder="descuento %" value={form.porcentaje_descuento} onChange={(e) => setForm({ ...form, porcentaje_descuento: e.target.value })} required style={{ width: 90 }} />
              <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="activa">activa</option>
                <option value="inactiva">inactiva</option>
                <option value="finalizada">finalizada</option>
              </Select>
            </div>
            <div className="row-inline">
              <label>Inicio: <input type="date" className="input" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></label>
              <label>Fin: <input type="date" className="input" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></label>
            </div>
            <div className="row-inline">
              <span>Productos:</span>
              {productos.map((p) => (
                <label key={p.id_producto} style={{ marginRight: 10 }}>
                  <input type="checkbox" checked={form.producto_ids.includes(p.id_producto)} onChange={() => toggleProducto(p.id_producto)} />
                  {p.nombre}
                </label>
              ))}
            </div>
            <div className="row-inline">
              <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
              {editando && <Button type="button" variant="secondary" onClick={cancelar}>Cancelar</Button>}
            </div>
          </form>
        </Card>
      </RequirePermiso>

      <Card title="Promociones">
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Descuento</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Productos</th><th></th></tr></thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id_promocion}>
                  <td>{p.nombre}</td>
                  <td>{p.porcentaje_descuento}%</td>
                  <td>{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString() : '—'}</td>
                  <td>{p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString() : '—'}</td>
                  <td><Badge tone={TONE_ESTADO[p.estado] || 'neutral'}>{p.estado}</Badge></td>
                  <td>{p.productos_count ?? 0}</td>
                  <td><RequirePermiso permiso="promocion.gestionar"><Button size="sm" variant="secondary" onClick={() => editar(p)}>Editar</Button></RequirePermiso></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
