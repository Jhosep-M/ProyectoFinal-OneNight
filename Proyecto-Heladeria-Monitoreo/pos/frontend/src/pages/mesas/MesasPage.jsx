import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { listarMesas, verMesa, crearMesa, actualizarMesa } from '../../services/mesasService.js';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const ESTADOS_MESA = {
  libre: { nombre: 'Libre', variante: 'success' },
  disponible: { nombre: 'Libre', variante: 'success' },
  ocupada: { nombre: 'Ocupada', variante: 'danger' },
  reservada: { nombre: 'Reservada', variante: 'warning' },
};

// Normaliza filas del backend (id_mesa/numero/estado) al shape que usa la UI.
const normMesa = (m) => ({
  ...m,
  id: m.id_mesa || m.id,
  numero: m.numero ?? m.nombre ?? m.id,
  estado: m.estado === 'disponible' ? 'libre' : m.estado,
});

export default function MesasPage() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await listarMesas();
        setMesas((data || []).map(normMesa));
      } catch (err) {
        setError('No se pudieron cargar las mesas');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const mesasFiltradas = filtro === 'todas'
    ? mesas
    : mesas.filter((m) => m.estado === filtro || (filtro === 'libre' && m.estado === 'disponible'));

  const handleSeleccionarMesa = async (mesa) => {
    setMesaSeleccionada(mesa);
    try {
      const detalle = await verMesa(mesa.id_mesa || mesa.id);
      if (detalle) setMesaSeleccionada(normMesa(detalle));
    } catch {
      // ya tenemos los datos básicos
    }
  };

  const handleNuevaMesa = async () => {
    setCreando(true);
    try {
      // El backend exige numero entero único: usar max+1, no "Mesa 01".
      const maxNumero = mesas.reduce((max, m) => Math.max(max, Number(m.numero) || 0), 0);
      const nueva = await crearMesa(maxNumero + 1);
      if (nueva) {
        setMesas((prev) => [...prev, normMesa(nueva)]);
      }
    } catch (err) {
      console.error('Error al crear mesa:', err);
    } finally {
      setCreando(false);
    }
  };

  const handleCambiarEstado = async (estado) => {
    if (!mesaSeleccionada) return;
    try {
      const id = mesaSeleccionada.id_mesa || mesaSeleccionada.id;
      const actualizada = await actualizarMesa(id, { estado });
      const norm = normMesa(actualizada);
      setMesas((prev) => prev.map((m) => ((m.id_mesa || m.id) === id ? norm : m)));
      setMesaSeleccionada(norm);
    } catch (err) {
      console.error('Error al cambiar estado de mesa:', err);
    }
  };

  if (loading) {
    return (
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="row g-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="col-6 col-md-4 col-xl-3">
                <Card className="h-100">
                  <Skeleton height="100px" />
                </Card>
              </div>
            ))}
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <Card>
            <Skeleton height="250px" />
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
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2 flex-wrap">
            {['todas', 'libre', 'ocupada', 'reservada'].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filtro === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFiltro(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="primary" icon="bi-plus-lg" onClick={handleNuevaMesa} disabled={creando}>
            {creando ? 'Creando...' : 'Nueva Mesa'}
          </Button>
        </div>

        <motion.div className="row g-3" variants={container} initial="hidden" animate="show">
          {mesasFiltradas.length === 0 ? (
            <div className="col-12 text-center text-muted py-5">
              <i className="bi bi-grid-3x3 fs-1"></i>
              <p className="mt-2">No hay mesas con este filtro</p>
            </div>
          ) : (
            mesasFiltradas.map((m) => (
              <div key={m.id} className="col-6 col-md-4 col-xl-3">
                <motion.div variants={item}>
                  <Card
                    className={`h-100 ${mesaSeleccionada?.id === m.id ? 'border-primary' : ''}`}
                    hover={false}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSeleccionarMesa(m)}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="mb-0" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                        {m.numero || `Mesa ${m.id}`}
                      </h6>
                      <Badge variant={ESTADOS_MESA[m.estado]?.variante || 'secondary'}>
                        {ESTADOS_MESA[m.estado]?.nombre || m.estado}
                      </Badge>
                    </div>
                    <div className="text-muted small mb-1">
                      {m.ocupados || 0}/{m.capacidad || 0} personas
                    </div>
                    {m.tiempo && (
                      <div className="text-muted small">
                        <i className="bi bi-clock me-1"></i>
                        {m.tiempo}
                      </div>
                    )}
                  </Card>
                </motion.div>
              </div>
            ))
          )}
        </motion.div>
      </div>

      <div className="col-12 col-lg-4">
        {mesaSeleccionada && (
          <Card className="sticky-top" style={{ top: '80px' }}>
            <h5 className="mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {mesaSeleccionada.numero || `Mesa ${mesaSeleccionada.id}`}
            </h5>

            <div className="mb-3">
              <div className="text-muted small">Capacidad</div>
              <div className="fw-semibold">{mesaSeleccionada.capacidad || 0} personas</div>
            </div>
            <div className="mb-3">
              <div className="text-muted small">Estado</div>
              <Badge variant={ESTADOS_MESA[mesaSeleccionada.estado]?.variante || 'secondary'}>
                {ESTADOS_MESA[mesaSeleccionada.estado]?.nombre || mesaSeleccionada.estado}
              </Badge>
            </div>

            <div style={{ borderTop: '1px dotted #D4C4B0' }} className="pt-3 mb-3"></div>

            <div className="d-flex justify-content-between mb-3">
              <span className="text-muted">Ocupados</span>
              <span className="fw-bold fs-5" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                {mesaSeleccionada.ocupados || 0}/{mesaSeleccionada.capacidad || 0}
              </span>
            </div>

            <div className="d-grid gap-2">
              <Button variant="secondary" icon="bi-person" onClick={() => handleCambiarEstado('ocupada')}>Asignar Mesero</Button>
              <Button variant="danger" icon="bi-x-lg" onClick={() => handleCambiarEstado('libre')}>Liberar Mesa</Button>
              <Button variant="primary" icon="bi-arrow-left-right" onClick={() => handleCambiarEstado('reservada')}>Reservar</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
