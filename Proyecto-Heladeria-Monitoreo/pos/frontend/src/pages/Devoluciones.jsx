import { useCallback, useEffect, useState } from 'react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Alert from '../components/ui/Alert.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Input from '../components/ui/Input.jsx';
import RequirePermiso from '../components/common/RequirePermiso.jsx';
import { listarDevoluciones, crearDevolucion, anularVenta, listarVentas } from '../services/devolucionesService.js';
import { productosService } from '../services/productosService.js';
import { formatCurrency } from '../utils/format.js';

const itemVacio = { producto_id: '', cantidad: 1 };

function nombreVenta(v) {
  const id = v.id_venta || v.id;
  const fecha = v.fecha ? new Date(v.fecha).toLocaleString('es-BO') : '';
  const total = v.total ?? v.subtotal;
  return `#${String(id).slice(0, 8)} · ${fecha}${total != null ? ` · ${formatCurrency(total)}` : ''}`;
}

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventaId, setVentaId] = useState('');
  const [items, setItems] = useState([{ ...itemVacio }]);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [anulando, setAnulando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devs, vtas, prods] = await Promise.all([
        listarDevoluciones().catch(() => []),
        listarVentas().catch(() => []),
        productosService.list().catch(() => []),
      ]);
      setDevoluciones(devs || []);
      setVentas((vtas || []).filter((v) => (v.estado || 'activa') === 'activa'));
      setProductos((prods || []).map((p) => ({ ...p, id: p.id_producto || p.id })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const setItem = (idx, campo, valor) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  };

  const agregarItem = () => setItems((prev) => [...prev, { ...itemVacio }]);
  const quitarItem = (idx) => setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const enviar = async (ev) => {
    ev.preventDefault();
    setResultado(null);
    if (!ventaId) {
      setResultado({ variant: 'danger', mensaje: 'Selecciona una venta.' });
      return;
    }
    if (motivo.trim().length < 5) {
      setResultado({ variant: 'danger', mensaje: 'El motivo debe tener al menos 5 caracteres.' });
      return;
    }
    const validos = items.filter((it) => it.producto_id && Number(it.cantidad) > 0);
    if (validos.length === 0) {
      setResultado({ variant: 'danger', mensaje: 'Agrega al menos un producto con cantidad mayor a 0.' });
      return;
    }
    setEnviando(true);
    try {
      // El backend acepta un producto por POST: se envía uno por ítem.
      const salidas = [];
      for (const it of validos) {
        try {
          const r = await crearDevolucion({
            venta_id: ventaId,
            producto_id: it.producto_id,
            cantidad: Number(it.cantidad),
            motivo: motivo.trim(),
          });
          salidas.push({ ok: true, respuesta: r });
        } catch (e) {
          salidas.push({ ok: false, error: e.message });
        }
      }
      const okCount = salidas.filter((s) => s.ok).length;
      setResultado({
        variant: okCount === salidas.length ? 'success' : 'warning',
        mensaje: `Devolución procesada: ${okCount}/${salidas.length} ítems aceptados.`
          + (salidas.some((s) => !s.ok) ? ` Errores: ${salidas.filter((s) => !s.ok).map((s) => s.error).join(' | ')}` : ''),
      });
      if (okCount > 0) {
        setItems([{ ...itemVacio }]);
        setMotivo('');
        cargar();
      }
    } finally {
      setEnviando(false);
    }
  };

  const anular = async (venta) => {
    const id = venta.id_venta || venta.id;
    const motivoAnul = window.prompt(`Motivo de anulación de la venta #${String(id).slice(0, 8)} (mínimo 5 caracteres):`, motivo || '');
    if (motivoAnul === null) return;
    if (motivoAnul.trim().length < 5) {
      setResultado({ variant: 'danger', mensaje: 'La anulación requiere un motivo de al menos 5 caracteres.' });
      return;
    }
    setAnulando(id);
    try {
      await anularVenta(id, motivoAnul.trim());
      setResultado({ variant: 'success', mensaje: `Venta #${String(id).slice(0, 8)} anulada y stock restaurado.` });
      cargar();
    } catch (e) {
      setResultado({ variant: 'danger', mensaje: e.message });
    } finally {
      setAnulando(null);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column gap-3">
        <Skeleton height="36px" />
        <Skeleton height="220px" />
        <Skeleton height="220px" />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <h1>Devoluciones</h1>
        <p className="text-muted">Devoluciones por producto y anulación de ventas activas (restauran inventario).</p>
      </div>

      {error && <Alert variant="danger" icon="bi-exclamation-triangle-fill">{error}</Alert>}
      {resultado && <Alert variant={resultado.variant} icon="bi-info-circle-fill">{resultado.mensaje}</Alert>}

      <RequirePermiso permiso="devolucion.procesar">
        <Card>
          <h5 className="mb-3">Nueva devolución por producto</h5>
          <form onSubmit={enviar}>
            <div className="mb-3">
              <label className="form-label" htmlFor="dev-venta">Venta activa</label>
              <select
                id="dev-venta"
                className="form-select"
                value={ventaId}
                onChange={(e) => setVentaId(e.target.value)}
                required
              >
                <option value="">Selecciona una venta…</option>
                {ventas.map((v) => (
                  <option key={v.id_venta || v.id} value={v.id_venta || v.id}>{nombreVenta(v)}</option>
                ))}
              </select>
            </div>

            {items.map((it, idx) => (
              <div key={idx} className="d-flex gap-2 align-items-end mb-2">
                <div className="flex-grow-1">
                  <label className="form-label" htmlFor={`dev-prod-${idx}`}>Producto</label>
                  <select
                    id={`dev-prod-${idx}`}
                    className="form-select"
                    value={it.producto_id}
                    onChange={(e) => setItem(idx, 'producto_id', e.target.value)}
                    required
                  >
                    <option value="">Selecciona…</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id_producto || p.id}>{p.nombre} · {formatCurrency(p.precio || 0)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 130 }}>
                  <Input
                    label="Cantidad"
                    type="number"
                    min={1}
                    step={1}
                    value={it.cantidad}
                    onChange={(e) => setItem(idx, 'cantidad', e.target.value)}
                  />
                </div>
                <Button type="button" variant="ghost" size="sm" icon="bi-trash" onClick={() => quitarItem(idx)} disabled={items.length <= 1} aria-label="Quitar ítem">
                  Quitar
                </Button>
              </div>
            ))}
            <div className="mb-2">
              <Button type="button" variant="outlineSecondary" size="sm" icon="bi-plus" onClick={agregarItem}>
                Agregar producto
              </Button>
            </div>

            <Input
              label="Motivo (mínimo 5 caracteres)"
              name="motivo"
              placeholder="Ej. producto en mal estado"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" icon="bi-arrow-counterclockwise" loading={enviando}>
              {enviando ? 'Procesando…' : 'Procesar devolución'}
            </Button>
          </form>
        </Card>
      </RequirePermiso>

      <Card>
        <h5 className="mb-3">Ventas anulables ({ventas.length})</h5>
        {ventas.length === 0 ? (
          <EmptyState title="Sin ventas activas" description="No hay ventas pendientes de anulación o devolución." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Venta</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {ventas.slice(0, 50).map((v) => {
                const id = v.id_venta || v.id;
                return (
                  <tr key={id}>
                    <td><code>#{String(id).slice(0, 8)}</code></td>
                    <td>{v.fecha ? new Date(v.fecha).toLocaleString('es-BO') : '—'}</td>
                    <td>{v.total != null ? formatCurrency(v.total) : '—'}</td>
                    <td><Badge variant="success">{v.estado || 'activa'}</Badge></td>
                    <td>
                      <RequirePermiso permiso="venta.anular" fallback={null}>
                        <Button size="sm" variant="outlineSecondary" onClick={() => setVentaId(id)}>
                          Devolver
                        </Button>{' '}
                        <Button size="sm" variant="danger" onClick={() => anular(v)} disabled={anulando === id}>
                          {anulando === id ? 'Anulando…' : 'Anular'}
                        </Button>
                      </RequirePermiso>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h5 className="mb-3">Historial de devoluciones ({devoluciones.length})</h5>
        {devoluciones.length === 0 ? (
          <EmptyState title="Sin devoluciones" description="Aún no se registraron devoluciones." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Motivo</th></tr></thead>
            <tbody>
              {devoluciones.slice(0, 100).map((d) => (
                <tr key={d.id_devolucion || d.id}>
                  <td>{d.fecha ? new Date(d.fecha).toLocaleString('es-BO') : '—'}</td>
                  <td>{d.producto_nombre || d.producto_id}</td>
                  <td>{d.cantidad}</td>
                  <td>{d.motivo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
