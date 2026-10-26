import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listarPedidos, crearPedido, actualizarPedido, cobrarPedido, verPedido } from '../../services/pedidosService.js';
import { listarMesas } from '../../services/mesasService.js';
import { listarTurnoAbiertoParaCobro } from '../../services/cajaService.js';
import { listarMetodosPago } from '../../services/ventasService.js';
import { usePermisos } from '../../context/PermisosContext.jsx';
import { productosService } from '../../services/productosService.js';
import { usePromocionesVigentes } from '../../hooks/usePromocionesVigentes.js';
import { useAutoRefresh } from '../../hooks/useAutoRefresh.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import ConfirmDialog from '../../components/modals/ConfirmDialog.jsx';
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
// Espejo de venta directa (Ventas → Cocina): ya cobrado, solo visible en Cocina.
// Nunca ofrece Cobrar en Pedidos/Mesero (evita doble venta + doble stock).
const esEspejoVenta = (p) => p?.origen === 'venta_directa' || !!p?.venta_id;
const esCobrable = (p) => (esAbierto(p.estado) || esListo(p.estado)) && !esEspejoVenta(p);

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
  const { tienePermiso } = usePermisos();
  const puedeAbrirTurno = tienePermiso('turno.abrir');
  const msgSinTurno = puedeAbrirTurno
    ? 'No hay turno abierto. Abre uno en Caja.'
    : 'No hay caja abierta. Pide a caja que abra turno para cobrar.';
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
  // Espejos venta_directa ya están cobrados en Ventas: ocultos por defecto
  // para que Pedidos sea el tablero del salón (cuenta por mesa).
  const [mostrarEspejos, setMostrarEspejos] = useState(false);
  const [cuentaExpandida, setCuentaExpandida] = useState(false);
  const [detallesCuenta, setDetallesCuenta] = useState({});
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cobrandoCuenta, setCobrandoCuenta] = useState(false);
  const [cobrandoId, setCobrandoId] = useState(null);
  const [progresoCuenta, setProgresoCuenta] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const promoMap = usePromocionesVigentes();

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
    const pendientes = list.filter((p) => esCobrable(p));
    return {
      abiertos: list.filter((p) => esAbierto(p.estado) && !esEspejoVenta(p)).length,
      listos: list.filter((p) => esListo(p.estado) && !esEspejoVenta(p)).length,
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
    // Tablero del salón: ocultar espejos de mostrador salvo que se pidan.
    if (!mostrarEspejos) list = list.filter((p) => !esEspejoVenta(p));
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
  }, [pedidos, filtroEstado, busqueda, mesas, mostrarEspejos]);

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
  // Regla de refresco automático: polling 15s + foco, sin Recargar manual.
  // Cubre cobros/avances hechos en Ventas, Cocina, Mesero u otra pestaña.
  useAutoRefresh(recargar, { intervalMs: 15000, onFocus: true });
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
      await crearPedido({ mesa_id: mesaId || null, items: limpios, origen: mesaId ? 'mesa' : 'mostrador' });
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
      // Optimista: refleja el cambio al instante, el poll lo confirma.
      setPedidos((prev) => prev.map((p) => (p.id_pedido === id ? { ...p, estado } : p)));
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const cancelar = async (id) => {
    setConfirmDialog({ tipo: 'cancelar', id });
  };

  const confirmarDialog = async () => {
    const cur = confirmDialog;
    setConfirmDialog(null);
    if (!cur) return;
    if (cur.tipo === 'cancelar') {
      await cambiarEstado(cur.id, 'cancelado');
      return;
    }
    if (cur.tipo === 'cobrar' && cur.pedido) {
      await ejecutarCobro(cur.pedido);
    }
  };

  const pedirCobro = (pedido) => {
    if (cobrandoId) return;
    // Cobro rápido en fila: 1 clic abre el modal sin cambiar el select de mesa.
    // Si la mesa tiene N pendientes, se indica 1/N y la mesa se libera sola al cobrar el último (backend).
    const esMesa = !!pedido.mesa_id;
    const pendientesMesa = esMesa
      ? (Array.isArray(pedidos) ? pedidos : []).filter(
          (x) => String(x.mesa_id || '') === String(pedido.mesa_id) && esCobrable(x)
        )
      : [];
    const nombreMesa = esMesa ? mesaLabel(pedido) : 'Mostrador';
    const totalFmt = fmtMoney(pedido.total);
    const idxEnCuenta = esMesa
      ? pendientesMesa.findIndex((x) => x.id_pedido === pedido.id_pedido)
      : -1;
    const detalleCuenta = pendientesMesa.length > 1
      ? ` (${(idxEnCuenta >= 0 ? idxEnCuenta + 1 : 1)}/${pendientesMesa.length} de la cuenta; la mesa sigue ocupada hasta el último)`
      : ' (último/único; libera la mesa)';
    setConfirmDialog({
      tipo: 'cobrar',
      pedido,
      titulo: `Cobrar ${totalFmt}`,
      mensaje: `¿Cobrar ${totalFmt} de ${nombreMesa}?${esMesa ? detalleCuenta : ''}`,
      textoBoton: `Cobrar ${totalFmt}`,
    });
  };

  const cobrar = (pedido) => pedirCobro(pedido);

  const ejecutarCobro = async (pedido) => {
    if (cobrandoId) return;
    const esMesa = !!pedido.mesa_id;
    const pendientesMesa = esMesa
      ? (Array.isArray(pedidos) ? pedidos : []).filter(
          (x) => String(x.mesa_id || '') === String(pedido.mesa_id) && esCobrable(x)
        )
      : [];
    const nombreMesa = esMesa ? mesaLabel(pedido) : 'Mostrador';
    const totalFmt = fmtMoney(pedido.total);
    try {
      setCobrandoId(pedido.id_pedido);
      // Opción A: mesero/cajero cobran sobre el turno abierto de caja,
      // sin abrir caja propia (GET /shifts/abierto exige venta.crear).
      const [turno, metodos] = await Promise.all([
        listarTurnoAbiertoParaCobro().catch(() => null),
        listarMetodosPago().catch(() => []),
      ]);
      if (!turno) {
        setAlert({ tone: 'error', message: msgSinTurno });
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
      setAlert({ tone: 'success', message: esMesa && pendientesMesa.length <= 1 ? `Cuenta cobrada: ${nombreMesa} — ${totalFmt}. Mesa liberada.` : `Pedido cobrado: ${nombreMesa} — ${totalFmt}` });
      // Optimista: lo saca de "por cobrar" al instante.
      setPedidos((prev) => prev.map((p) => (p.id_pedido === pedido.id_pedido ? { ...p, estado: 'cerrado', fecha_cierre: new Date().toISOString() } : p)));
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); } finally {
      setCobrandoId(null);
    }
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

  // Cobrar cuenta completa: cobra cada pedido cobrable en secuencia con el mismo turno.
  // La mesa queda libre sola al cobrar el último (backend). Si falla uno, se detiene
  // y deja el resto pendiente con mensaje de reintento.
  const cobrarCuenta = async () => {
    const lista = (cuentaMesa?.pedidos || []).filter((p) => esCobrable(p));
    if (lista.length === 0 || cobrandoCuenta) return;
    setAlert(null);
    setCobrandoCuenta(true);
    setProgresoCuenta({ done: 0, total: lista.length });
    try {
      const [turno, metodos] = await Promise.all([
        listarTurnoAbiertoParaCobro().catch(() => null),
        listarMetodosPago().catch(() => []),
      ]);
      if (!turno) {
        setAlert({ tone: 'error', message: msgSinTurno });
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
      // Optimista: marca los cobrados (ok) como cerrados al instante.
      const cobradosIds = new Set(lista.slice(0, ok).map((p) => p.id_pedido));
      if (cobradosIds.size > 0) {
        setPedidos((prev) => prev.map((p) => (cobradosIds.has(p.id_pedido) ? { ...p, estado: 'cerrado', fecha_cierre: new Date().toISOString() } : p)));
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
            <RequirePermiso permiso="venta.crear" fallback={null}>
              <Button size="sm" onClick={cobrarCuenta} loading={cobrandoCuenta} disabled={cobrandoCuenta || cuentaMesa.n === 0}>
                {cobrandoCuenta && progresoCuenta
                  ? `Cobrando ${progresoCuenta.done + 1}/${progresoCuenta.total}…`
                  : `Cobrar cuenta ${fmtMoney(cuentaMesa.total)} (${cuentaMesa.n})`}
              </Button>
            </RequirePermiso>
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
          <p className="field-hint">
            {mesaId
              ? 'Con mesa: se suma a su cuenta y la mesa se ocupa sola.'
              : 'Sin mesa = mostrador / llevar. Lo rápido se cobra mejor en Ventas.'}
            {!mesaId && (
              <span style={{ marginLeft: 6 }}>
                <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/ventas')}>
                  Ir a Ventas
                </Button>
              </span>
            )}
          </p>

          <div className="pedido-lineas__head" aria-hidden="true">
            <span>Producto</span>
            <span>Cant.</span>
            <span>Subtotal</span>
            <span />
          </div>

          {items.map((it, k) => {
            const prod = productosById.get(String(it.producto_id || ''));
            const sub = (Number(prod?.precio) || 0) * (Number(it.cantidad) || 0);
            const promoSel = promoMap.get(String(it.producto_id || ''));
            return (
              <div className="pedido-linea" key={k}>
                <Select
                  label={k === 0 ? 'Producto' : undefined}
                  value={it.producto_id}
                  onChange={(e) => setItem(k, { producto_id: e.target.value })}
                  required
                >
                  <option value="">Selecciona producto…</option>
                  {productos.map((p) => {
                    const pid = String(p.id_producto || p.id || '');
                    const promo = promoMap.get(pid);
                    const pct = promo ? Number(promo.porcentaje_descuento) || 0 : 0;
                    return (
                      <option key={p.id_producto || p.id} value={p.id_producto || p.id}>
                        {p.nombre} — Bs {Number(p.precio ?? 0).toFixed(2)}{promo ? ` (-${pct}%)` : ''}
                      </option>
                    );
                  })}
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
                <div className="pedido-linea__subtotal">{prod ? fmtMoney(sub) : '—'}{promoSel && <div><Badge tone="success">-{Number(promoSel.porcentaje_descuento) || 0}% promo</Badge></div>}</div>
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
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={mostrarEspejos}
                onChange={(e) => setMostrarEspejos(e.target.checked)}
                aria-label="Mostrar mostrador cobrado en ventas"
              />
              <span style={{ fontSize: '0.85rem' }}>Ver mostrador</span>
            </label>
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
            <p>{pedidos.length === 0 ? 'Aún no hay pedidos. Crea el primero arriba.' : mostrarEspejos ? 'Ningún pedido coincide con el filtro.' : 'Sin cuentas de salón. Activa “Ver mostrador” para ver lo cobrado en Ventas.'}</p>
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
                          {esEspejoVenta(p) ? (
                            <Badge tone="neutral">Cobrado en ventas</Badge>
                          ) : (
                            <>
                              {esCobrable(p) && (
                                <Button
                                  size="sm"
                                  onClick={() => cobrar(p)}
                                  loading={cobrandoId === p.id_pedido}
                                  disabled={cobrandoId === p.id_pedido}
                                  title={p.mesa_id ? `Cobro rápido de ${mesaLabel(p)} sin cambiar el select` : 'Cobro directo (mostrador)'}
                                >
                                  {`Cobrar ${fmtMoney(p.total)}`}
                                </Button>
                              )}
                              {esCobrable(p) && p.mesa_id && (
                                <span style={{ marginLeft: 6, opacity: 0.65, fontSize: '0.75rem' }}>en cuenta</span>
                              )}
                            </>
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

      <ConfirmDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmarDialog}
        title={confirmDialog?.tipo === 'cancelar' ? 'Cancelar pedido' : confirmDialog?.titulo || 'Cobrar'}
        message={confirmDialog?.tipo === 'cancelar' ? '¿Cancelar este pedido?' : confirmDialog?.mensaje || ''}
        confirmText={confirmDialog?.tipo === 'cancelar' ? 'Sí, cancelar' : confirmDialog?.textoBoton || 'Confirmar'}
        danger={confirmDialog?.tipo === 'cancelar'}
      />
    </div>
  );
}
