import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatCurrency, formatTime } from '../../utils/format.js';
import { listarVentas } from '../../services/ventasService.js';
import { listarMesas } from '../../services/mesasService.js';
import { listarAlertasMonitoreo } from '../../services/alertasService.js';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const ESTADOS_VENTA = {
  activa: { nombre: 'Completado', variante: 'success' },
  completado: { nombre: 'Completado', variante: 'success' },
  pendiente: { nombre: 'Pendiente', variante: 'warning' },
  anulada: { nombre: 'Anulado', variante: 'danger' },
  anulado: { nombre: 'Anulado', variante: 'danger' },
};

// Nivel de alerta_pos para alertas de Monitoreo (NIVEL_DB en
// posBackend/src/routes/integrations.js): bajo|medio|critico.
const NIVEL_ALERTA = {
  bajo: { nombre: 'Bajo', variante: 'info' },
  medio: { nombre: 'Advertencia', variante: 'warning' },
  critico: { nombre: 'Crítico', variante: 'danger' },
};

// Las filas del backend usan id_venta, total como string (NUMERIC) y
// estado 'activa'/'anulada'. Se normaliza para la UI.
const normVenta = (v) => ({
  ...v,
  id: v.id_venta || v.id,
  total: Number(v.total) || 0,
  estado: v.estado === 'anulada' ? 'anulado' : v.estado === 'activa' ? 'completado' : v.estado,
});

export default function DashboardPage() {
  const [ventas, setVentas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ventasData, mesasData, alertasData] = await Promise.all([
          listarVentas(),
          listarMesas(),
          listarAlertasMonitoreo({ limit: 10 }).catch(() => ({ data: [] })),
        ]);
        setVentas((ventasData || []).map(normVenta));
        setMesas(mesasData || []);
        setAlertas(alertasData?.data || []);
      } catch (err) {
        setError('No se pudieron cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalVentas = ventas
    .filter((v) => v.estado !== 'anulado')
    .reduce((sum, v) => sum + (v.total || 0), 0);
  const pedidosCount = ventas.length;
  const mesasOcupadas = mesas.filter((m) => m.estado === 'ocupada').length;
  const mesasTotal = mesas.length;

  const metricas = [
    { titulo: 'Ventas del día', valor: formatCurrency(totalVentas), icono: 'bi-cash-stack', color: 'success' },
    { titulo: 'Pedidos', valor: String(pedidosCount), icono: 'bi-clipboard', color: 'info' },
    { titulo: 'Mesas ocupadas', valor: `${mesasOcupadas}/${mesasTotal}`, icono: 'bi-grid-3x3', color: 'warning' },
    { titulo: 'Ticket promedio', valor: pedidosCount > 0 ? formatCurrency(totalVentas / pedidosCount) : formatCurrency(0), icono: 'bi-receipt', color: 'primary' },
  ];

  const pedidosRecientes = [...ventas]
    .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at))
    .slice(0, 8);

  if (loading) {
    return (
      <div className="d-flex flex-column gap-3">
        <div className="row g-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-12 col-md-6 col-xl-3">
              <Card className="h-100">
                <Skeleton height="80px" />
              </Card>
            </div>
          ))}
        </div>
        <Card>
          <Skeleton height="200px" />
        </Card>
        <Card>
          <Skeleton height="250px" />
        </Card>
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
    <motion.div variants={container} initial="hidden" animate="show">
      <div className="row g-3 mb-4">
        {metricas.map((m) => (
          <div key={m.titulo} className="col-12 col-md-6 col-xl-3">
            <motion.div variants={item}>
              <Card className="h-100">
                <div className="d-flex align-items-center">
                  <div className={`rounded-circle bg-soft-${m.color} p-3 me-3`}>
                    <i className={`bi ${m.icono} text-${m.color} fs-5`}></i>
                  </div>
                  <div>
                    <div className="text-muted small text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                      {m.titulo}
                    </div>
                    <div className="fw-bold fs-4" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                      {m.valor}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        ))}
      </div>

      <motion.div variants={item} className="mt-3">
        <Card>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Pedidos recientes
            </h5>
            <Badge variant="secondary">{pedidosRecientes.length} pedidos</Badge>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hora</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidosRecientes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-4">
                      No hay pedidos registrados
                    </td>
                  </tr>
                ) : (
                  pedidosRecientes.map((v) => (
                    <tr key={v.id}>
                      <td className="fw-semibold">#{v.id}</td>
                      <td className="text-muted">{formatTime(v.fecha || v.created_at)}</td>
                      <td className="fw-semibold">{formatCurrency(v.total || 0)}</td>
                      <td>
                        <Badge variant={ESTADOS_VENTA[v.estado]?.variante || 'secondary'}>
                          {ESTADOS_VENTA[v.estado]?.nombre || v.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item} className="mt-3">
        <Card>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Alertas de Monitoreo
            </h5>
            <Badge variant={alertas.length ? 'warning' : 'secondary'}>{alertas.length} alertas</Badge>
          </div>
          {alertas.length === 0 ? (
            <EmptyState
              icon="bi-bell-slash"
              title="Sin alertas de Monitoreo"
              description="Cuando Monitoreo detecte un exceso de consumo, la alerta aparecerá aquí."
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Nivel</th>
                    <th>Recurso</th>
                    <th>Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((a) => (
                    <tr key={a.id_alerta}>
                      <td className="text-muted">{formatTime(a.creado_en)}</td>
                      <td>
                        <Badge variant={NIVEL_ALERTA[a.nivel]?.variante || 'secondary'}>
                          {NIVEL_ALERTA[a.nivel]?.nombre || a.nivel}
                        </Badge>
                      </td>
                      <td className="text-capitalize">{a.tipo}</td>
                      <td>{a.mensaje}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
