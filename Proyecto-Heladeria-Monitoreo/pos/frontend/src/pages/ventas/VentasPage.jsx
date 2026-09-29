import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { formatCurrency } from '../../utils/format.js';
import { productosService, categoriasService } from '../../services/productosService.js';
import { crearVenta } from '../../services/ventasService.js';
import { listarTurnos } from '../../services/cajaService.js';
import { listarMetodosPago } from '../../services/ventasService.js';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function VentasPage() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [metodosPago, setMetodosPago] = useState([]);
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCobro, setErrorCobro] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState('todos');
  const [ticket, setTicket] = useState([]);
  const [cobrando, setCobrando] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productosData, categoriasData, turnosData, metodosData] = await Promise.all([
          productosService.list(),
          categoriasService.list(),
          listarTurnos().catch(() => []),
          listarMetodosPago().catch(() => []),
        ]);
        setProductos((productosData || []).map((p) => ({ ...p, id: p.id_producto || p.id })));
        setCategorias((categoriasData || []).map((c) => ({ ...c, id: c.id_categoria || c.id })));
        const abierto = (turnosData || []).find((t) => t.estado === 'abierto') || null;
        setTurnoActivo(abierto);
        const metodos = metodosData || [];
        setMetodosPago(metodos);
        if (metodos[0]) setMetodoPagoId(metodos[0].id_metodo || metodos[0].id);
      } catch (err) {
        setError('No se pudieron cargar los productos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const productosFiltrados = categoriaActiva === 'todos'
    ? productos
    : productos.filter((p) => p.categoria_id === categoriaActiva || p.categoria === categoriaActiva);

  const agregarProducto = (producto) => {
    setTicket((prev) => {
      const existente = prev.find((i) => i.id === producto.id);
      if (existente) {
        return prev.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const actualizarCantidad = (id, delta) => {
    setTicket((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter((i) => i.cantidad > 0)
    );
  };

  const subtotal = ticket.reduce((sum, i) => sum + (i.precio || 0) * i.cantidad, 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const handleCobrar = async () => {
    if (ticket.length === 0) return;
    setErrorCobro(null);
    if (!turnoActivo) {
      setErrorCobro('No hay turno abierto. Abre un turno en Caja antes de cobrar.');
      return;
    }
    if (!metodoPagoId) {
      setErrorCobro('No hay método de pago disponible.');
      return;
    }
    setCobrando(true);
    try {
      // El backend exige turno_id UUID, items {producto_id UUID, cantidad}
      // y pagos {metodo_pago_id UUID, monto}. Sin turno_id siempre daba 400.
      const items = ticket.map((i) => ({ producto_id: i.id_producto || i.id, cantidad: i.cantidad }));
      const payload = {
        turno_id: turnoActivo.id_turno || turnoActivo.id,
        items,
        pagos: [{ metodo_pago_id: metodoPagoId, monto: total }],
      };
      await crearVenta(payload);
      setTicket([]);
    } catch (err) {
      console.error('Error al cobrar:', err);
      setErrorCobro(err.message);
    } finally {
      setCobrando(false);
    }
  };

  if (loading) {
    return (
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="d-flex flex-column gap-3">
            <Skeleton height="40px" />
            <div className="row g-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="col-6 col-md-4 col-xl-3">
                  <Card className="h-100">
                    <Skeleton height="120px" />
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <Card>
            <Skeleton height="300px" />
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
        <i className="bi bi-exclamation-triangle-fill"></i>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-8">
        <div className="d-flex flex-column gap-3">
          <div className="d-flex gap-2 flex-wrap">
            <button
              className={`btn btn-sm ${categoriaActiva === 'todos' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setCategoriaActiva('todos')}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                className={`btn btn-sm ${categoriaActiva === cat.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setCategoriaActiva(cat.id)}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          <motion.div className="row g-3" variants={container} initial="hidden" animate="show">
            {productosFiltrados.length === 0 ? (
              <div className="col-12 text-center text-muted py-5">
                <i className="bi bi-box-seam fs-1"></i>
                <p className="mt-2">No hay productos en esta categoría</p>
              </div>
            ) : (
              productosFiltrados.map((p) => (
                <div key={p.id} className="col-6 col-md-4 col-xl-3">
                  <motion.div variants={item}>
                    <Card
                      className="h-100"
                      hover={false}
                      style={{ cursor: 'pointer' }}
                      onClick={() => agregarProducto(p)}
                    >
                      <div
                        className="mb-2"
                        style={{
                          height: '80px',
                          background: p.color || '#F5E6D3',
                          borderBottom: '1px dotted #D4C4B0',
                        }}
                      ></div>
                      <h6 className="mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                        {p.nombre}
                      </h6>
                      <div className="fw-bold" style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#8B6914' }}>
                        {formatCurrency(p.precio || 0)}
                      </div>
                    </Card>
                  </motion.div>
                </div>
              ))
            )}
          </motion.div>
        </div>
      </div>

      <div className="col-12 col-lg-4">
        <Card className="sticky-top" style={{ top: '80px' }}>
          <h5 className="mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Ticket Actual
          </h5>

          {!turnoActivo && !loading && (
            <div className="alert alert-warning d-flex align-items-center gap-2" role="alert">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>Sin turno abierto. Abre uno en Caja para poder cobrar.</span>
            </div>
          )}
          {errorCobro && (
            <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{errorCobro}</span>
            </div>
          )}

          {ticket.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="bi bi-cart fs-1"></i>
              <p className="mt-2">Agrega productos al ticket</p>
            </div>
          ) : (
            <>
              <div className="d-flex flex-column gap-2 mb-3">
                {ticket.map((i) => (
                  <div key={i.id} className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold small">{i.nombre}</div>
                      <div className="text-muted small">{formatCurrency(i.precio || 0)}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => actualizarCantidad(i.id, -1)}>
                        <i className="bi bi-dash"></i>
                      </button>
                      <span className="fw-semibold">{i.cantidad}</span>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => actualizarCantidad(i.id, 1)}>
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dotted #D4C4B0' }} className="pt-3 mb-3"></div>

              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">IVA (16%)</span>
                <span>{formatCurrency(iva)}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="fw-bold">Total</span>
                <span className="fw-bold fs-5" style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#8B6914' }}>
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="d-grid gap-2">
                {metodosPago.length > 0 && (
                  <select
                    className="form-select"
                    value={metodoPagoId}
                    onChange={(e) => setMetodoPagoId(e.target.value)}
                    aria-label="Método de pago"
                  >
                    {metodosPago.map((m) => (
                      <option key={m.id_metodo || m.id} value={m.id_metodo || m.id}>
                        {m.nombre || 'Método de pago'}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  icon="bi-cash-stack"
                  onClick={handleCobrar}
                  disabled={cobrando || ticket.length === 0 || !turnoActivo}
                >
                  {cobrando ? 'Procesando...' : `Cobrar ${formatCurrency(total)}`}
                </Button>
                <Button variant="ghost" onClick={() => setTicket([])}>
                  Limpiar
                </Button>
              </div>
            </>
          )}
        </Card>
=======
import { anularVenta, crearDevolucion, crearVenta, listarMetodosPago, listarVentas } from '../../services/ventasService.js';

const emptyItem = () => ({ producto_id: '', cantidad: 1 });
const emptyPago = () => ({ metodo_pago_id: '', monto: '' });

export default function VentasPage() {
  const [ventas, setVentas] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [turnoId, setTurnoId] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [pagos, setPagos] = useState([emptyPago()]);
  const [msg, setMsg] = useState('');
  const [dev, setDev] = useState({ venta_id: '', producto_id: '', cantidad: 1, motivo: '' });

  const recargar = async () => {
    try {
      setVentas(await listarVentas());
      setMetodos(await listarMetodosPago());
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };
  useEffect(() => { recargar(); }, []);

  const vender = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const r = await crearVenta({
        turno_id: turnoId,
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) })),
        pagos: pagos.map((p) => ({ metodo_pago_id: p.metodo_pago_id, monto: Number(p.monto) })),
      });
      setMsg(`Venta creada: ${r.venta_id}`);
      setItems([emptyItem()]);
      setPagos([emptyPago()]);
      recargar();
    } catch (e2) { setMsg(`Error: ${e2.message}`); }
  };

  const anular = async (id) => {
    const motivo = window.prompt('Motivo de anulación (≥5 caracteres):');
    if (!motivo) return;
    try {
      await anularVenta(id, motivo);
      setMsg('Venta anulada');
      recargar();
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };

  const devolver = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const r = await crearDevolucion({ ...dev, cantidad: Number(dev.cantidad) });
      setMsg(`Devolución procesada: ${JSON.stringify(r)}`);
      setDev({ venta_id: '', producto_id: '', cantidad: 1, motivo: '' });
    } catch (e2) { setMsg(`Error: ${e2.message}`); }
  };

  return (
    <div>
      <h2>Ventas</h2>
      {msg && <p className={msg.startsWith('Error') ? 'error' : 'ok'}>{msg}</p>}

      <div className="card">
        <h3>Nueva venta</h3>
        <form onSubmit={vender}>
          <div className="row">
            <input placeholder="turno_id (UUID abierto)" value={turnoId} onChange={(e) => setTurnoId(e.target.value)} required size={38} />
          </div>
          {items.map((it, k) => (
            <div className="row" key={k}>
              <input placeholder="producto_id" value={it.producto_id} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, producto_id: e.target.value } : x)))} required size={36} />
              <input type="number" min={1} step={1} value={it.cantidad} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, cantidad: e.target.value } : x)))} required style={{ width: 80 }} />
              <button type="button" onClick={() => setItems(items.filter((_, j) => j !== k))}>−</button>
            </div>
          ))}
          <div className="row"><button type="button" onClick={() => setItems([...items, emptyItem()])}>+ producto</button></div>
          {pagos.map((p, k) => (
            <div className="row" key={k}>
              <select value={p.metodo_pago_id} onChange={(e) => setPagos(pagos.map((x, j) => (j === k ? { ...x, metodo_pago_id: e.target.value } : x)))} required>
                <option value="">método…</option>
                {metodos.map((m) => <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>)}
              </select>
              <input type="number" min={0.01} step={0.01} placeholder="monto" value={p.monto} onChange={(e) => setPagos(pagos.map((x, j) => (j === k ? { ...x, monto: e.target.value } : x)))} required style={{ width: 110 }} />
              <button type="button" onClick={() => setPagos(pagos.filter((_, j) => j !== k))}>−</button>
            </div>
          ))}
          <div className="row"><button type="button" onClick={() => setPagos([...pagos, emptyPago()])}>+ pago (dividido)</button></div>
          <button type="submit">Cobrar</button>
        </form>
      </div>

      <div className="card">
        <h3>Últimas ventas</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id_venta}>
                <td>{new Date(v.fecha).toLocaleString()}</td>
                <td>{v.total}</td>
                <td>{v.estado}</td>
                <td>{v.estado === 'activa' && <button onClick={() => anular(v.id_venta)}>Anular</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Devolución</h3>
        <form onSubmit={devolver}>
          <div className="row">
            <input placeholder="venta_id" value={dev.venta_id} onChange={(e) => setDev({ ...dev, venta_id: e.target.value })} required size={36} />
            <input placeholder="producto_id" value={dev.producto_id} onChange={(e) => setDev({ ...dev, producto_id: e.target.value })} required size={36} />
            <input type="number" min={1} step={1} value={dev.cantidad} onChange={(e) => setDev({ ...dev, cantidad: e.target.value })} required style={{ width: 80 }} />
            <input placeholder="motivo (≥5)" value={dev.motivo} onChange={(e) => setDev({ ...dev, motivo: e.target.value })} required />
            <button type="submit">Procesar</button>
          </div>
        </form>
>>>>>>> origin/feature/Airton-auxilio
      </div>
    </div>
  );
}
