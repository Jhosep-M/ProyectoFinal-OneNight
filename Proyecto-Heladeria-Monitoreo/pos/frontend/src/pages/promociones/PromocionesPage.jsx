import { useEffect, useState } from 'react';
import { listarPromociones, verPromocion, crearPromocion, actualizarPromocion, eliminarPromocion } from '../../services/promotionsService.js';
import { productosService } from '../../services/productosService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
import ConfirmDialog from '../../components/modals/ConfirmDialog.jsx';

const empty = { nombre: '', porcentaje_descuento: 0, fecha_inicio: '', fecha_fin: '', estado: 'activa', producto_ids: [] };

const TONE_ESTADO = { activa: 'success', inactiva: 'neutral', finalizada: 'info' };

export default function PromocionesPage() {
  const [promos, setPromos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editando, setEditando] = useState(null);
  const [alert, setAlert] = useState(null);
  const [soloVigentes, setSoloVigentes] = useState(false);
  const [promoPendiente, setPromoPendiente] = useState(null);
  const hoyISO = new Date().toISOString().slice(0, 10);

  const esVigente = (p) => {
    if (p.estado !== 'activa') return false;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (p.fecha_inicio && new Date(p.fecha_inicio) < new Date(new Date().toISOString().slice(0, 10))) return false;
    if (p.fecha_fin && new Date(p.fecha_fin) < hoy) return false;
    return true;
  };

  const promosVisibles = soloVigentes ? promos.filter(esVigente) : promos;

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
    if (form.fecha_inicio && form.fecha_inicio < hoyISO) {
      setAlert({ tone: 'error', message: 'La fecha de inicio no puede ser anterior a hoy.' });
      return;
    }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      setAlert({ tone: 'error', message: 'La fecha de fin debe ser mayor o igual a la de inicio.' });
      return;
    }
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

  const eliminar = (p) => {
    setPromoPendiente(p);
  };

  const ejecutarEliminar = async () => {
    const p = promoPendiente;
    setPromoPendiente(null);
    if (!p) return;
    setAlert(null);
    try {
      await eliminarPromocion(p.id_promocion);
      setPromos((prev) => prev.filter((x) => x.id_promocion !== p.id_promocion));
      setAlert({ tone: 'success', message: 'Promoción eliminada' });
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  return (
    <div>
      <h1>Promociones</h1>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <RequirePermiso permiso="promocion.gestionar">
        <Card title={editando ? 'Editar promoción' : 'Nueva promoción'}>
          <form onSubmit={guardar}>
            <div className="row-inline">
              <Input placeholder="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              <div className="field" style={{ maxWidth: 160 }}>
                <label htmlFor="descuento">Descuento</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="descuento"
                    name="descuento"
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="descuento %"
                    value={form.porcentaje_descuento}
                    onChange={(e) => setForm({ ...form, porcentaje_descuento: e.target.value })}
                    required
                    style={{ width: '100%', paddingRight: 30, fontVariantNumeric: 'tabular-nums' }}
                  />
                  <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>%</span>
                </div>
              </div>
              <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="activa">activa</option>
                <option value="inactiva">inactiva</option>
                <option value="finalizada">finalizada</option>
              </Select>
            </div>
            <div className="row-inline">
              <label>Inicio: <input type="date" className="input" min={hoyISO} value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></label>
              <label>Fin: <input type="date" className="input" min={form.fecha_inicio || hoyISO} value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></label>
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
        <div className="row-inline" style={{ marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={soloVigentes} onChange={(e) => setSoloVigentes(e.target.checked)} />
            Solo vigentes
          </label>
        </div>
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Descuento</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Productos</th><th></th></tr></thead>
            <tbody>
              {promosVisibles.map((p) => (
                <tr key={p.id_promocion}>
                  <td>{p.nombre}</td>
                  <td style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{p.porcentaje_descuento}%</td>
                  <td>{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString() : '—'}</td>
                  <td>{p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString() : '—'}</td>
                  <td><Badge tone={TONE_ESTADO[p.estado] || 'neutral'}>{p.estado}{esVigente(p) ? ' · vigente' : ''}</Badge></td>
                  <td>{(p.productos || []).map((x) => x.producto_nombre || x.nombre).filter(Boolean).join(', ') || (p.productos_count ? `${p.productos_count} prod.` : '—')}</td>
                  <td><RequirePermiso permiso="promocion.gestionar"><span style={{ display: 'flex', gap: 6 }}><Button size="sm" variant="secondary" onClick={() => editar(p)}>Editar</Button><Button size="sm" variant="danger" onClick={() => eliminar(p)}>Eliminar</Button></span></RequirePermiso></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!promoPendiente}
        onClose={() => setPromoPendiente(null)}
        onConfirm={ejecutarEliminar}
        title="Eliminar promoción"
        message={promoPendiente ? `¿Eliminar "${promoPendiente.nombre}"? Se quitará de la lista.` : ''}
        confirmText="Eliminar"
        danger
      />
    </div>
  );
}
