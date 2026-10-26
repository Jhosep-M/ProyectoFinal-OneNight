import { useEffect, useMemo, useState } from 'react';
import { listarPedidos, crearPedido, cobrarPedido } from '../../services/pedidosService.js';
import { listarMesas } from '../../services/mesasService.js';
import { listarTurnoAbiertoParaCobro } from '../../services/cajaService.js';
import { listarMetodosPago } from '../../services/ventasService.js';
import { productosService, categoriasService } from '../../services/productosService.js';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Select from '../../components/common/Select.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';

const ACTIVOS = ['abierto', 'pendiente', 'en_preparacion', 'listo'];

const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `Bs ${n.toFixed(2)}`;
};

export default function MeseroPage() {
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [mesaId, setMesaId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [creando, setCreando] = useState(false);
  const [turnoCaja, setTurnoCaja] = useState(null);
  const [cobrandoId, setCobrandoId] = useState(null);

  const recargar = async () => {
    setLoading(true);
    try {
      const [p, m, prods, cats, turno] = await Promise.all([
        listarPedidos().catch(() => []),
        listarMesas().catch(() => []),
        productosService.list().catch(() => []),
        categoriasService.list().catch(() => []),
        // Opción A: turno abierto de caja para cobrar sin abrir caja propia.
        // Sin venta.crear o sin turno -> null (no bloquea la vista de pedidos).
        listarTurnoAbiertoParaCobro().catch(() => null),
      ]);
      setPedidos(Array.isArray(p) ? p : []);
      setMesas(Array.isArray(m) ? m : []);
      setProductos(Array.isArray(prods) ? prods : []);
      setCategorias(Array.isArray(cats) ? cats : []);
      setTurnoCaja(turno || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    recargar();
  }, []);

  const pendientes = useMemo(
    () => (Array.isArray(pedidos) ? pedidos.filter((p) => ACTIVOS.includes(p.estado)) : []),
    [pedidos]
  );

  // Opción A: el mesero cobra sobre el turno abierto de caja.
  // No abre/cierra caja; la venta queda en turno_caja de caja y la
  // auditoría registra al mesero (registrar_venta: p_usuario_id=JWT).
  const cobrar = async (pedido) => {
    setAlert(null);
    const monto = Number(pedido.total) || 0;
    if (!(monto > 0)) {
      setAlert({ tone: 'error', message: 'El pedido no tiene total para cobrar.' });
      return;
    }
    setCobrandoId(pedido.id_pedido);
    try {
      const turno = turnoCaja || (await listarTurnoAbiertoParaCobro().catch(() => null));
      if (!turno) {
        setAlert({ tone: 'error', message: 'No hay caja abierta. Pide a caja que abra turno para cobrar.' });
        return;
      }
      setTurnoCaja(turno);
      const metodos = await listarMetodosPago().catch(() => []);
      const metodo = (metodos || [])[0];
      const metodoId = metodo?.id_metodo_pago || metodo?.id_metodo || metodo?.id;
      if (!metodoId) {
        setAlert({ tone: 'error', message: 'No hay métodos de pago configurados.' });
        return;
      }
      await cobrarPedido(pedido.id_pedido, {
        turno_id: turno.id_turno || turno.id,
        pagos: [{ metodo_pago_id: metodoId, monto }],
      });
      setAlert({ tone: 'success', message: `Pedido cobrado en turno de ${turno.cajero_email || 'caja'}. Entrega el efectivo a caja.` });
      await recargar();
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    } finally {
      setCobrandoId(null);
    }
  };

  const crear = async () => {
    setAlert(null);
    if (!productoId) {
      setAlert({ tone: 'error', message: 'Selecciona un producto.' });
      return;
    }
    if (!(Number(cantidad) >= 1)) {
      setAlert({ tone: 'error', message: 'La cantidad debe ser mayor o igual a 1.' });
      return;
    }
    setCreando(true);
    try {
      await crearPedido({ mesa_id: mesaId || null, items: [{ producto_id: productoId, cantidad: Number(cantidad) }] });
      setAlert({ tone: 'success', message: 'Pedido creado.' });
      setProductoId('');
      setCantidad(1);
      await recargar();
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    } finally {
      setCreando(false);
    }
  };

  return (
    <div>
      <h1>Mis pedidos</h1>
      <p className="text-muted">
        Crea pedidos a mesa y cóbralos en el turno abierto de caja. No necesitas abrir caja propia.
        {turnoCaja ? ` Turno de caja: ${turnoCaja.cajero_email || 'caja'} — el efectivo se entrega a caja.` : ' Sin turno de caja abierto: pide a caja que abra turno para cobrar.'}
      </p>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <Card title="Nuevo pedido">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Select label="Mesa" value={mesaId} onChange={(e) => setMesaId(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">Mostrador / Para llevar</option>
            {mesas.map((m) => (
              <option key={m.id_mesa || m.id} value={m.id_mesa || m.id}>
                Mesa {m.numero ?? m.nombre ?? ''}{m.estado ? ` — ${m.estado}` : ''}
              </option>
            ))}
          </Select>
          <Select label="Producto" value={productoId} onChange={(e) => setProductoId(e.target.value)} style={{ minWidth: 200 }} required>
            <option value="">Selecciona producto…</option>
            {productos.map((p) => (
              <option key={p.id_producto || p.id} value={p.id_producto || p.id}>
                {p.nombre} — Bs {Number(p.precio ?? 0).toFixed(2)}
              </option>
            ))}
          </Select>
          <label className="field">
            <span>Cant.</span>
            <input type="number" min={1} step={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} aria-label="Cantidad" />
          </label>
          <Button onClick={crear} loading={creando} disabled={creando}>
            Crear pedido
          </Button>
        </div>
      </Card>

      <Card title={`Pendientes (${pendientes.length})`}>
        {loading ? (
          <p>Cargando…</p>
        ) : pendientes.length === 0 ? (
          <p>Sin pedidos pendientes.</p>
        ) : (
          <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Mesa</th><th>Mesero</th><th>Total</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {pendientes.map((p) => (
                <tr key={p.id_pedido}>
                  <td><strong>{p.mesa_numero !== undefined && p.mesa_numero !== null ? `Mesa ${p.mesa_numero}` : 'Mostrador'}</strong></td>
                  <td>{p.mesero_nombre || '—'}</td>
                  <td>{fmtMoney(p.total)}</td>
                  <td><Badge tone="warning">{p.estado}</Badge></td>
                  <td style={{ textAlign: 'right' }}>
                    <RequirePermiso permiso="venta.crear" fallback={null}>
                      <Button
                        size="sm"
                        onClick={() => cobrar(p)}
                        loading={cobrandoId === p.id_pedido}
                        disabled={cobrandoId === p.id_pedido}
                        title={turnoCaja ? `Cobrar en turno de ${turnoCaja.cajero_email || 'caja'}` : 'Cobrar en turno de caja'}
                      >
                        Cobrar
                      </Button>
                    </RequirePermiso>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <Card title="Catálogo (solo lectura)">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h4>Productos ({productos.length})</h4>
            <ul>
              {productos.slice(0, 20).map((p) => (
                <li key={p.id_producto || p.id}>{p.nombre} — {fmtMoney(p.precio)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Categorías ({categorias.length})</h4>
            <ul>
              {categorias.map((c) => (
                <li key={c.id_categoria || c.id}>{c.nombre}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
