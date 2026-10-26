import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listarPedidos, crearPedido, actualizarPedido, cobrarPedido, verPedido } from '../../services/pedidosService.js';
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

const horaRaw = (p) => p.fecha_pedido || p.fecha_hora || p.created_at || p.createdAt || p.hora;

const horaMs = (p) => {
  const raw = horaRaw(p);
  if (!raw) return 0;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const horaPedido = (p) => {
  const raw = horaRaw(p);
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(11, 16);
  return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
};

const pesoEstado = (p) => (esAbierto(p.estado) ? 0 : esListo(p.estado) ? 1 : esCerrado(p.estado) ? 2 : 3);

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
  const [cuentaExpandida, setCuentaExpandida] = useState(false);
  const [detallesCuenta, setDetallesCuenta] = useState({});
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cobrandoCuenta, setCobrandoCuenta] = useState(false);
  const [progresoCuenta, setProgresoCuenta] = useState(null);

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
      pedidos: deMesa,
    };
  }, [pedidos, mesaId]);

  // Productos agregados de la cuenta (suma por producto_id desde detalles cargados).
  const productosCuenta = useMemo(() => {
    const agg = new Map();
    for (const p of cuentaMesa?.pedidos || []) {
      const det = detallesCuenta[p.id_pedido]?.detalles || p.detalles || [];
      for (const d of det) {
        const key = String(d.producto_id || d.producto_nombre || 'item');
        const cur = agg.get(key) || {
          nombre: d.producto_nombre || productosById.get(String(d.producto_id || ''))?.nombre || 'Producto',
          cantidad: 0,
          subtotal: 0,
        };
        cur.cantidad += Number(d.cantidad) || 0;
        cur.subtotal += (Number(d.cantidad) || 0) * (Number(d.precio_unitario ?? d.precio) || 0);
        agg.set(key, cur);
      }
    }
    return [...agg.values()];
  }, [cuentaMesa, detallesCuenta, productosById]);

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
    // Operación de salón: activos primero, los más viejos de cada grupo arriba.
    list.sort((a, b) => pesoEstado(a) - pesoEstado(b) || horaMs(a) - horaMs(b));
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

  const cambiarCant = (k, delta) =>
    setItems((prev) =>
      prev.map((x, j) => (j === k ? { ...x, cantidad: Math.max(1, (Number(x.cantidad) || 1) + delta) } : x))
    );

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

  const cargarDetalleCuenta = async () => {
    const lista = cuentaMesa?.pedidos || [];
    const faltantes = lista.filter((p) => !detallesCuenta[p.id_pedido] && !p.detalles);
    if (faltantes.length === 0) return;
    setCargandoDetalle(true);
    try {
      const res = await Promise.all(
        faltantes.map(async (p) => {
          try {
            const full = await verPedido(p.id_pedido);
            return [p.id_pedido, full];
          } catch {
            return [p.id_pedido, null];
          }
        })
      );
      setDetallesCuenta((prev) => {
        const next = { ...prev };
        for (const [id, full] of res) {
          if (full) next[id] = full;
        }
        return next;
      });
    } finally {
      setCargandoDetalle(false);
    }
  };

  const toggleCuenta = async () => {
    const next = !cuentaExpandida;
    setCuentaExpandida(next);
    if (next) await cargarDetalleCuenta();
  };

  // Cobrar cuenta completa: cobra cada pedido abierto en secuencia con el mismo turno.
  // La mesa queda libre sola al cobrar el último (backend). Si falla uno, se detiene
  // y deja el resto pendiente con mensaje de reintento.
  const cobrarCuenta = async () => {
    const lista = (cuentaMesa?.pedidos || []).filter((p) => esAbierto(p.estado) || esListo(p.estado));
    if (lista.length === 0 || cobrandoCuenta) return;
    setAlert(null);
    setCobrandoCuenta(true);
    setProgresoCuenta({ done: 0, total: lista.length });
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
      let ok = 0;
      let fail = null;
      for (const p of lista) {
        try {
          await cobrarPedido(p.id_pedido, {
            turno_id: turno.id_turno || turno.id,
            pagos: [{ metodo_pago_id: metodoId, monto: Number(p.total) || 0 }],
          });
          ok += 1;
          setProgresoCuenta({ done: ok, total: lista.length });
        } catch (e) {
          fail = { pedido: p, message: e.message };
          break;
        }
      }
      if (!fail) {
        setAlert({ tone: 'success', message: `Cuenta cobrada: ${ok}/${lista.length} pedidos — ${fmtMoney(cuentaMesa.total)}` });
      } else {
        setAlert({ tone: 'error', message: `Se cobraron ${ok}/${lista.length}. Falló ${shortId(fail.pedido.id_pedido)}: ${fail.message}. Reintenta los restantes.` });
      }
      recargar();
    } finally {
      setCobrandoCuenta(false);
      setProgresoCuenta(null);
    }
  };

  return (
    <div>
      {/* El título lo muestra el topbar; aquí solo descripción + resumen operativo */}
      <div className="pedidos-resumen">
        <p className="pedidos-resumen__desc">
          Crea y sigue los pedidos del salón. La mesa se libera al cobrar la cuenta.
        </p>
        <div className="pedidos-resumen__stats">
          <span className="chip-stat chip-stat--warning">
            <span className="chip-stat__label">Abiertos</span>
            <span className="chip-stat__value">{stats.abiertos}</span>
          </span>
          <span className="chip-stat chip-stat--success">
            <span className="chip-stat__label">Listos</span>
            <span className="chip-stat__value">{stats.listos}</span>
          </span>
          <span className="chip-stat">
            <span className="chip-stat__label">Por cobrar</span>
            <span className="chip-stat__value" style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(stats.porCobrar)}</span>
          </span>
        </div>
      </div>

      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      {mesaId && cuentaMesa && cuentaMesa.n > 0 && (
        <Card title={`${mesaLabel({ mesa_id: mesaId, mesa_numero: mesasById.get(String(mesaId))?.numero })} — cuenta abierta`}>
          <div
            role="button"
            tabIndex={0}
            onClick={toggleCuenta}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCuenta(); } }}
            aria-expanded={cuentaExpandida}
            className="cuenta-resumen"
            title="Presiona para ver todos los productos de la cuenta"
          >
            <span className="cuenta-resumen__amount" style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(cuentaMesa.total)}</span>
            <span className="cuenta-resumen__meta">
              {cuentaMesa.n} pedido(s) sin cobrar. Toca para ver los productos; el último cobro libera la mesa.
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="sm" onClick={() => navigate('/mesas')}>Volver a mesas</Button>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <Button variant="secondary" size="sm" onClick={toggleCuenta}>
              {cuentaExpandida ? 'Ocultar detalle' : 'Ver detalle'}
            </Button>
            <Button size="sm" onClick={cobrarCuenta} loading={cobrandoCuenta} disabled={cobrandoCuenta || cuentaMesa.n === 0}>
              {cobrandoCuenta && progresoCuenta
                ? `Cobrando ${progresoCuenta.done + 1}/${progresoCuenta.total}…`
                : `Cobrar cuenta ${fmtMoney(cuentaMesa.total)} (${cuentaMesa.n})`}
            </Button>
          </div>
          {cuentaExpandida && (
            <div style={{ marginTop: 12 }}>
              {cargandoDetalle ? (
                <p style={{ opacity: 0.7 }}>Cargando productos…</p>
              ) : productosCuenta.length > 0 ? (
                <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Producto</th><th>Cant.</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {productosCuenta.map((it, i) => (
                      <tr key={i}>
                        <td>{it.nombre}</td>
                        <td>{it.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>{fmtMoney(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cuentaMesa.pedidos.map((p) => (
                    <div key={p.id_pedido} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>Pedido {shortId(p.id_pedido)} · {p.mesero_nombre || 'Sin mesero'} · {p.estado}</span>
                      <strong>{fmtMoney(p.total)}</strong>
                    </div>
                  ))}
                  <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>Toca Ver detalle para cargar los productos de cada pedido.</span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <Card title="Nuevo pedido">
        {loadErrors.mesas && (
          <Alert tone="error" message={`Mesas: ${loadErrors.mesas}`} onClose={() => recargar()} />
        )}
        {loadErrors.productos && (
          <Alert tone="error" message={`Productos: ${loadErrors.productos}`} onClose={() => recargar()} />
        )}
        <form onSubmit={crear}>
          <Select
            label="Mesa"
            value={mesaId}
            onChange={(e) => setMesaId(e.target.value)}
            style={{ minWidth: 220, maxWidth: 320 }}
          >
            <option value="">Mostrador / Para llevar</option>
            {mesas.map((m) => (
              <option key={m.id_mesa || m.id} value={m.id_mesa || m.id}>
                Mesa {m.numero ?? m.nombre ?? shortId(m.id_mesa || m.id)}
                {m.estado ? ` — ${m.estado}` : ''}
              </option>
            ))}
          </Select>
          <p className="field-hint">Sin mesa = mostrador / llevar</p>

          <div className="pedido-lineas__head" aria-hidden="true">
            <span>Producto</span>
            <span>Cant.</span>
            <span>Subtotal</span>
            <span />
          </div>

          {items.map((it, k) => {
            const prod = productosById.get(String(it.producto_id || ''));
            const sub = (Number(prod?.precio) || 0) * (Number(it.cantidad) || 0);
            return (
              <div className="pedido-linea" key={k}>
                <Select
                  label={k === 0 ? 'Producto' : undefined}
                  value={it.producto_id}
                  onChange={(e) => setItem(k, { producto_id: e.target.value })}
                  required
                >
                  <option value="">Selecciona producto…</option>
                  {productos.map((p) => (
                    <option key={p.id_producto || p.id} value={p.id_producto || p.id}>
                      {p.nombre} — Bs {Number(p.precio ?? 0).toFixed(2)}
                    </option>
                  ))}
                </Select>
                <div className="stepper">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => cambiarCant(k, -1)}
                    disabled={(Number(it.cantidad) || 1) <= 1}
                    title="Restar cantidad"
                  >
                    −
                  </Button>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="1"
                    aria-label="Cantidad"
                    value={it.cantidad}
                    onChange={(e) => setItem(k, { cantidad: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => cambiarCant(k, +1)}
                    title="Sumar cantidad"
                  >
                    +
                  </Button>
                </div>
                <div className="pedido-linea__subtotal">{prod ? fmtMoney(sub) : '—'}</div>
                <Button
                  type="button"
                  className="icon-btn"
                  onClick={() => setItems(items.filter((_, j) => j !== k))}
                  disabled={items.length === 1}
                  title="Quitar producto"
                >
                  ✕
                </Button>
              </div>
            );
          })}

          <div className="pedido-footer">
            <Button type="button" variant="secondary" onClick={() => setItems([...items, emptyItem()])}>
              + producto
            </Button>
            <div className="pedido-footer__total">
              <span className="pedido-footer__label">Total estimado</span>
              <strong className="pedido-footer__amount" style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(totalNuevo)}</strong>
              <Button type="submit" loading={creando} disabled={creando}>
                Crear pedido
              </Button>
            </div>
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
          <div className="skeleton-list" aria-busy="true">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
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
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Mesa</th><th>Mesero</th><th>Hora</th><th>Total</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => (
                  <tr key={p.id_pedido}>
                    <td><strong>{mesaLabel(p)}</strong></td>
                    <td>{p.mesero_nombre || shortId(p.mesero_id)}</td>
                    <td>{horaPedido(p)}</td>
                    <td style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(p.total)}</td>
                    <td><Badge tone={TONE_ESTADO[p.estado] || 'neutral'}>{p.estado}</Badge></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span className="row-actions">
                        <RequirePermiso permiso="pedido.gestionar">
                          {esAbierto(p.estado) && (
                            <Button size="sm" variant="secondary" onClick={() => cambiarEstado(p.id_pedido, 'listo')}>Listo</Button>
                          )}
                          {esAbierto(p.estado) && (
                            <Button size="sm" variant="ghost" onClick={() => cancelar(p.id_pedido)}>Cancelar</Button>
                          )}
                        </RequirePermiso>
                        <RequirePermiso permiso="venta.crear">
                          {(esAbierto(p.estado) || esListo(p.estado)) && !p.mesa_id && (
                            <Button size="sm" onClick={() => cobrar(p)} title="Cobro directo (mostrador)">Cobrar</Button>
                          )}
                          {(esAbierto(p.estado) || esListo(p.estado)) && p.mesa_id && (
                            <Badge tone="info">Se cobra en cuenta</Badge>
                          )}
                        </RequirePermiso>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
