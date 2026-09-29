import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { formatCurrency } from '../../utils/format.js';
import { productosService, categoriasService } from '../../services/productosService.js';
import { crearVenta } from '../../services/ventasService.js';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState('todos');
  const [ticket, setTicket] = useState([]);
  const [cobrando, setCobrando] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productosData, categoriasData] = await Promise.all([
          productosService.list(),
          categoriasService.list(),
        ]);
        setProductos(productosData || []);
        setCategorias(categoriasData || []);
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
    setCobrando(true);
    try {
      const items = ticket.map((i) => ({ producto_id: i.id, cantidad: i.cantidad, precio: i.precio }));
      const payload = { items, pagos: [{ metodo: 'efectivo', monto: total }] };
      console.log('crearVenta payload (pendiente turno_id):', payload);
      await crearVenta(payload);
      setTicket([]);
    } catch (err) {
      console.error('Error al cobrar:', err);
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
                <Button
                  variant="primary"
                  size="lg"
                  icon="bi-cash-stack"
                  onClick={handleCobrar}
                  disabled={cobrando || ticket.length === 0}
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
      </div>
    </div>
  );
}
