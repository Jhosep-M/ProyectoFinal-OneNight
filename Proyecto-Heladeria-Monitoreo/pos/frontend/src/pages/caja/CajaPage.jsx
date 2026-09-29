import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { formatCurrency, formatTime } from '../../utils/format.js';
import { listarTurnos } from '../../services/cajaService.js';
import { listarVentas } from '../../services/ventasService.js';
import { cerrarTurno } from '../../services/cajaService.js';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const ESTADOS = {
  completado: { nombre: 'Completado', variante: 'success' },
  anulado: { nombre: 'Anulado', variante: 'danger' },
  pendiente: { nombre: 'Pendiente', variante: 'warning' },
};

export default function CajaPage() {
  const [turnos, setTurnos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [turnosData, ventasData] = await Promise.all([
          listarTurnos(),
          listarVentas(),
        ]);
        setTurnos(turnosData || []);
        setVentas(ventasData || []);
      } catch (err) {
        setError('No se pudieron cargar los datos de caja');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const turnoActivo = turnos.find((t) => t.estado === 'abierto') || turnos[0] || null;

  const ventasTurno = turnoActivo
    ? ventas.filter((v) => v.turno_id === turnoActivo.id)
    : ventas;

  const totalVentas = ventasTurno
    .filter((v) => v.estado !== 'anulado')
    .reduce((sum, v) => sum + (v.total || 0), 0);

  const handleCerrarTurno = async () => {
    if (!turnoActivo) return;
    setCerrando(true);
    try {
      await cerrarTurno(turnoActivo.id, totalVentas);
      const turnosData = await listarTurnos();
      setTurnos(turnosData || []);
    } catch (err) {
      console.error('Error al cerrar turno:', err);
    } finally {
      setCerrando(false);
    }
  };

  if (loading) {
    return (
      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <Card className="h-100">
            <Skeleton height="300px" />
          </Card>
        </div>
        <div className="col-12 col-lg-8">
          <Card className="h-100">
            <Skeleton height="350px" />
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
    <motion.div className="row g-3" variants={container} initial="hidden" animate="show">
      <div className="col-12 col-lg-4">
        <motion.div variants={item}>
          <Card className="h-100">
            <h5 className="mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Turno Actual
            </h5>
            {turnoActivo ? (
              <>
                <div className="mb-3">
                  <div className="text-muted small">Turno</div>
                  <div className="fw-semibold">{turnoActivo.nombre || `Turno #${turnoActivo.id}`}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Apertura</div>
                  <div className="fw-semibold">{formatTime(turnoActivo.fecha_apertura || turnoActivo.created_at)}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Cajero</div>
                  <div className="fw-semibold">{turnoActivo.cajero || turnoActivo.usuario || '—'}</div>
                </div>

                <div style={{ borderTop: '1px dotted #D4C4B0' }} className="pt-3 mb-3"></div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <div className="text-muted small">Ventas</div>
                    <div className="fw-bold fs-5" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                      {formatCurrency(totalVentas)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Transacciones</div>
                    <div className="fw-bold fs-5">{ventasTurno.length}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Ticket promedio</div>
                    <div className="fw-bold">
                      {ventasTurno.length > 0 ? formatCurrency(totalVentas / ventasTurno.length) : formatCurrency(0)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Efectivo en caja</div>
                    <div className="fw-bold">{formatCurrency(turnoActivo.monto_inicial || 0)}</div>
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    icon="bi-lock"
                    onClick={handleCerrarTurno}
                    disabled={cerrando}
                  >
                    {cerrando ? 'Cerrando...' : 'Cerrar Turno'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted py-4">
                <i className="bi bi-clock fs-1"></i>
                <p className="mt-2">No hay un turno activo</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <div className="col-12 col-lg-8">
        <motion.div variants={item}>
          <Card className="h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Transacciones del Turno
              </h5>
              <Badge variant="secondary">{ventasTurno.length} transacciones</Badge>
            </div>

            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hora</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasTurno.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-4">
                        No hay transacciones en este turno
                      </td>
                    </tr>
                  ) : (
                    ventasTurno.map((v) => (
                      <tr key={v.id}>
                        <td className="fw-semibold">#{v.id}</td>
                        <td className="text-muted">{formatTime(v.fecha || v.created_at)}</td>
                        <td className="fw-semibold">{formatCurrency(v.total || 0)}</td>
                        <td>
                          <Badge variant={ESTADOS[v.estado]?.variante || 'secondary'}>
                            {ESTADOS[v.estado]?.nombre || v.estado}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                Mostrando {ventasTurno.length} transacciones
              </span>
              <span className="fw-bold" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Total: {formatCurrency(totalVentas)}
              </span>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
