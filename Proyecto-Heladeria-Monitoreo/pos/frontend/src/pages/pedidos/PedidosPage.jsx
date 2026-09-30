import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listarPedidos, crearPedido, actualizarPedido, cobrarPedido } from '../../services/pedidosService.js';
import { listarMesas } from '../../services/mesasService.js';
import { listarTurnos } from '../../services/cajaService.js';
import { listarMetodosPago } from '../../services/ventasService.js';
import { productosService } from '../../services/productosService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';

// Flujo simplificado "cuenta por mesa": Abierto → Listo → Cobrado (+ Cancelado).
// El backend aún acepta 'en_preparacion'/'pendiente'/'cerrado' por datos viejos:
// aquí se agrupan para no complicar la UI.
const TONE_ESTADO = {
  abierto: 'warning',
  pendiente: 'warning',
  en_preparacion: 'warning',
  listo: 'success',
  cerrado: 'neutral',
  cobrado: 'neutral',
  cancelado: 'error',
};

const esAbierto = (e) => e === 'abierto' || e === 'pendiente' || e === 'en_preparacion';
const esListo = (e) => e === 'listo';
const esCerrado = (e) => e === 'cerrado' || e === 'cobrado';

const emptyItem = () => ({ producto_id: '', cantidad: 1 });

const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `Bs ${n.toFixed(2)}`;
};

const shortId = (id) => (id ? String(id).slice(0, 8) : '—');

export default function PedidosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mesaDeURL = searchParams.get('mesa') || '';
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState({ pedidos: null, mesas: null, productos: null });
  const [mesaId, setMesaId] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [alert, setAlert] = useState(null);
  const [creando, setCreando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const productosById = useMemo(() => {
    const map = new Map();
    for (const p of productos || []) {
      const id = p.id_producto || p.id;
      if (id) map.set(String(id), p);
    }
    return map;
  }, [productos]);

  const mesasById = useMemo(() => {
    const map = new Map();
    for (const m of mesas || []) {
      const id = m.id_mesa || m.id;
      if (id) map.set(String(id), m);
    }
    return map;
  }, [mesas]);

  const mesaLabel = (p) => {
    if (p.mesa_numero !== undefined && p.mesa_numero !== null) return `Mesa ${p.mesa_numero}`;
    const m = mesasById.get(String(p.mesa_id || ''));
    if (m) return `Mesa ${m.numero ?? m.nombre ?? shortId(m.id_mesa || m.id)}`;
    return p.mesa_id ? `Mesa ${shortId(p.mesa_id)}` : 'Sin mesa';
  };

  const totalNuevo = useMemo(
    () =>
      items.reduce((acc, it) => {
        const prod = productosById.get(String(it.producto_id || ''));
        const precio = Number(prod?.precio ?? 0);
        const cant = Number(it.cantidad ?? 0);
        return acc + (Number.isFinite(precio) && Number.isFinite(cant) ? precio * cant : 0);
      }, 0),
    [items, productosById]
  );

  const stats = useMemo(() => {
    const list = Array.isArray(pedidos) ? pedidos : [];
    const pendientes = list.filter((p) => esAbierto(p.estado) || esListo(p.estado));
    return {
      abiertos: list.filter((p) => esAbierto(p.estado)).length,
      listos: list.filter((p) => esListo(p.estado)).length,
      porCobrar: pendientes.reduce((acc, p) => acc + (Number(p.total) || 0), 0),
    };
  }, [pedidos]);

  // Cuenta de la mesa enfocada (viene de Mesas con ?mesa=): suma lo no cobrado.
  const cuentaMesa = useMemo(() => {
    if (!mesaId) return null;
    const deMesa = (Array.isArray(pedidos) ? pedidos : []).filter(
      (p) => String(p.mesa_id || '') === String(mesaId) && (esAbierto(p.estado) || esListo(p.estado))
    );
    return {
      n: deMesa.length,
      total: deMesa.reduce((acc, p) => acc + (Number(p.total) || 0), 0),
    };
  }, [pedidos, mesaId]);

  const coincideFiltro = (p) => {
    if (filtroEstado === 'todos') return true;
    if (filtroEstado === 'abierto') return esAbierto(p.estado);
    if (filtroEstado === 'cerrado') return esCerrado(p.estado);
    return p.estado === filtroEstado;
  };

  const pedidosFiltrados = useMemo(() => {
    let list = Array.isArray(pedidos) ? [...pedidos] : [];
    // Si se viene de Mesas (?mesa=), mostrar primero esa cuenta.
    if (mesaDeURL) {
      const deMesa = list.filter((p) => String(p.mesa_id || '') === String(mesaDeURL));
      const resto = list.filter((p) => String(p.mesa_id || '') !== String(mesaDeURL));
      list = [...deMesa, ...resto];
    }
    list = list.filter(coincideFiltro);
    const q = busqueda.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const mesa = mesaLabel(p).toLowerCase();
        const mesero = String(p.mesero_nombre || p.mesero_id || '').toLowerCase();
        return mesa.includes(q) || mesero.includes(q) || String(p.estado || '').includes(q);
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidos, filtroEstado, busqueda, mesas]);

  const recargar = async () => {
    setLoading(true);
    // allSettled: si falla productos o mesas, igual se muestran los pedidos
    // y cada sección indica su error con botón Reintentar.
    const [rPed, rMes, rPro] = await Promise.allSettled([
      listarPedidos(),
      listarMesas(),
      productosService.list(),
    ]);
    const errs = { pedidos: null, mesas: null, productos: null };
    if (rPed.status === 'fulfilled') {
      setPedidos(Array.isArray(rPed.value) ? rPed.value : []);
    } else {
      errs.pedidos = rPed.reason?.message || 'No se pudieron cargar los pedidos';
    }
    if (rMes.status === 'fulfilled') {
      setMesas(Array.isArray(rMes.value) ? rMes.value : []);
    } else {
      errs.mesas = rMes.reason?.message || 'No se pudieron cargar las mesas';
    }
    if (rPro.status === 'fulfilled') {
      setProductos(Array.isArray(rPro.value) ? rPro.value : []);
    } else {
      errs.productos = rPro.reason?.message || 'No se pudieron cargar los productos';
    }
    setLoadErrors(errs);
    const primero = errs.pedidos || errs.mesas || errs.productos;
    if (primero) {
      const detalle = [errs.pedidos && 'pedidos', errs.mesas && 'mesas', errs.productos && 'productos']
        .filter(Boolean)
        .join(', ');
      setAlert({ tone: 'error', message: `${primero} (${detalle})` });
    } else {
      setAlert((a) => (a?.tone === 'error' ? null : a));
    }
    setLoading(false);
  };
  useEffect(() => { recargar(); }, []);
  // Llegada desde Mesas ("Nuevo pedido" / "Ver cuenta"): preselecciona la mesa.
  useEffect(() => {
    if (mesaDeURL) setMesaId(mesaDeURL);
  }, [mesaDeURL]);

  const setItem = (k, patch) =>
    setItems((prev) => prev.map((x, j) => (j === k ? { ...x, ...patch } : x)));

  const crear = async (e) => {
    e.preventDefault();
    setAlert(null);
    const limpios = items
      .filter((i) => i.producto_id)
      .map((i) => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) }));
    if (limpios.length === 0) {
      setAlert({ tone: 'error', message: 'Agrega al menos un producto.' });
      return;
    }
    if (limpios.some((i) => !(i.cantidad >= 1))) {
      setAlert({ tone: 'error', message: 'Cada cantidad debe ser mayor o igual a 1.' });
      return;
    }
    setCreando(true);
    try {
      // Sin mesa = mostrador / para llevar. Con mesa = se suma a su cuenta
      // y la mesa se ocupa sola (backend).
      await crearPedido({ mesa_id: mesaId || null, items: limpios });
      const destino = mesaId ? mesaLabel({ mesa_id: mesaId }) : 'Mostrador';
      setAlert({ tone: 'success', message: `Pedido creado para ${destino} — ${fmtMoney(totalNuevo)}` });
      setItems([emptyItem()]);
      recargar();
    } catch (e2) {
      setAlert({ tone: 'error', message: e2.message });
    } finally {
      setCreando(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarPedido(id, { estado });
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const cancelar = async (id) => {
    if (!window.confirm('¿Cancelar este pedido?')) return;
    await cambiarEstado(id, 'cancelado');
  };

  const cobrar = async (pedido) => {
    try {
      const [turnos, metodos] = await Promise.all([
        listarTurnos().catch(() => []),
        listarMetodosPago().catch(() => []),
      ]);
      const turno = (turnos || []).find((t) => t.estado === 'abierto');
      if (!turno) {
        setAlert({ tone: 'error', message: 'No hay turno abierto. Abre uno en Caja.' });
        return;
      }
      const metodo = (metodos || [])[0];
      const metodoId = metodo?.id_metodo || metodo?.id_metodo_pago || metodo?.id;
      if (!metodoId) {
        setAlert({ tone: 'error', message: 'No hay métodos de pago configurados.' });
        return;
      }
      const monto = Number(pedido.total) || 0;
      if (!(monto > 0)) {
        setAlert({ tone: 'error', message: 'El pedido no tiene total para cobrar.' });
        return;
      }
      await cobrarPedido(pedido.id_pedido, {
        turno_id: turno.id_turno || turno.id,
        pagos: [{ metodo_pago_id: metodoId, monto }],
      });
      setAlert({ tone: 'success', message: 'Pedido cobrado' });
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Pedidos</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Abierto → Listo → Cobrado. La mesa se ocupa y libera sola.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone="warning">Abiertos: {stats.abiertos}</Badge>
          <Badge tone="success">Listos: {stats.listos}</Badge>
          <Badge tone="neutral">Por cobrar: {fmtMoney(stats.porCobrar)}</Badge>
        </div>
      </div>

      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      {mesaId && cuentaMesa && cuentaMesa.n > 0 && (
        <Card title={`${mesaLabel({ mesa_id: mesaId, mesa_numero: mesasById.get(String(mesaId))?.numero })} — cuenta abierta`}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{fmtMoney(cuentaMesa.total)}</span>
            <span style={{ opacity: 0.7 }}>{cuentaMesa.n} pedido(s) sin cobrar. Cada pedido se suma a esta cuenta; al cobrar el último, la mesa queda libre sola.</span>
            <Button variant="secondary" size="sm" onClick={() => navigate('/mesas')}>Volver a mesas</Button>
          </div>
        </Card>
      )}

      <Card title="Nuevo pedido">
        <p style={{ marginTop: 0, opacity: 0.7, fontSize: '0.85rem' }}>
          Paso 1: mesa · Paso 2: productos · Paso 3: crear
        </p>
        {loadErrors.mesas && (
          <Alert tone="error" message={`Mesas: ${loadErrors.mesas}`} onClose={() => recargar()} />
        )}
        {loadErrors.productos && (
          <Alert tone="error" message={`Productos: ${loadErrors.productos}`} onClose={() => recargar()} />
        )}
        <form onSubmit={crear}>
          <div className="row-inline" style={{ alignItems: 'flex-end' }}>
            <Select
              label="Mesa (vacío = mostrador)"
              value={mesaId}
              onChange={(e) => setMesaId(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">Mostrador / Para llevar</option>
              {mesas.map((m) => (
                <option key={m.id_mesa || m.id} value={m.id_mesa || m.id}>
                  Mesa {m.numero ?? m.nombre ?? shortId(m.id_mesa || m.id)}
                  {m.estado ? ` — ${m.estado}` : ''}
                </option>
              ))}
            </Select>
            <div style={{ fontSize: '0.9rem', paddingBottom: 8 }}>
              Total estimado: <strong>{fmtMoney(totalNuevo)}</strong>
            </div>
          </div>

          {items.map((it, k) => {
            const prod = productosById.get(String(it.producto_id || ''));
            const sub = (Number(prod?.precio) || 0) * (Number(it.cantidad) || 0);
            return (
              <div className="row-inline" key={k} style={{ alignItems: 'flex-end' }}>
                <Select
                  label={k === 0 ? 'Producto' : `Producto ${k + 1}`}
                  value={it.producto_id}
                  onChange={(e) => setItem(k, { producto_id: e.target.value })}
                  required
                  style={{ minWidth: 240 }}
                >
                  <option value="">Selecciona producto…</option>
                  {productos.map((p) => (
                    <option key={p.id_producto || p.id} value={p.id_producto || p.id}>
                      {p.nombre} — Bs {Number(p.precio ?? 0).toFixed(2)}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Cant."
                  type="number"
                  min={1}
                  step={1}
                  placeholder="1"
                  value={it.cantidad}
                  onChange={(e) => setItem(k, { cantidad: e.target.value })}
                  required
                  style={{ width: 90 }}
                />
                <div style={{ minWidth: 90, fontSize: '0.9rem', paddingBottom: 8 }}>
                  {prod ? fmtMoney(sub) : '—'}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setItems(items.filter((_, j) => j !== k))}
                  disabled={items.length === 1}
                  title="Quitar producto"
                >
                  −
                </Button>
              </div>
            );
          })}

          <div className="row-inline">
            <Button type="button" variant="secondary" onClick={() => setItems([...items, emptyItem()])}>
              + producto
            </Button>
            <Button type="submit" loading={creando} disabled={creando}>
              Crear pedido
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Pedidos"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Input
              placeholder="Buscar mesa o mesero…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: 200 }}
            />
            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ width: 170 }}>
              <option value="todos">Todos</option>
              <option value="abierto">Abiertos</option>
              <option value="listo">Listos</option>
              <option value="cerrado">Cobrados</option>
              <option value="cancelado">Cancelados</option>
            </Select>
            <Button variant="secondary" size="sm" onClick={recargar}>Recargar</Button>
          </div>
        }
      >
        {loading ? (
          <p>Cargando pedidos…</p>
        ) : loadErrors.pedidos ? (
          <div className="empty-state">
            <h3>No se pudieron cargar los pedidos</h3>
            <p>{loadErrors.pedidos}</p>
            <Button size="sm" onClick={recargar}>Reintentar</Button>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="empty-state">
            <h3>Sin pedidos</h3>
            <p>{pedidos.length === 0 ? 'Aún no hay pedidos. Crea el primero arriba.' : 'Ningún pedido coincide con el filtro.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Mesa</th><th>Mesero</th><th>Total</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((p) => (
                <tr key={p.id_pedido}>
                  <td><strong>{mesaLabel(p)}</strong></td>
                  <td>{p.mesero_nombre || shortId(p.mesero_id)}</td>
                  <td>{fmtMoney(p.total)}</td>
                  <td><Badge tone={TONE_ESTADO[p.estado] || 'neutral'}>{p.estado}</Badge></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <RequirePermiso permiso="pedido.gestionar">
                      {esAbierto(p.estado) && (
                        <Button size="sm" variant="secondary" onClick={() => cambiarEstado(p.id_pedido, 'listo')}>Listo</Button>
                      )}
                      {esAbierto(p.estado) && (
                        <Button size="sm" variant="ghost" onClick={() => cancelar(p.id_pedido)}>Cancelar</Button>
                      )}
                    </RequirePermiso>
                    <RequirePermiso permiso="venta.crear">
                      {(esAbierto(p.estado) || esListo(p.estado)) && (
                        <Button size="sm" onClick={() => cobrar(p)} title={esAbierto(p.estado) ? 'Cobro directo (mostrador)' : 'Cobrar cuenta'}>Cobrar</Button>
                      )}
                    </RequirePermiso>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
