import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { formatCurrency, formatTime } from '../../utils/format.js';
import { listarTurnos } from '../../services/cajaService.js';
import { listarVentas } from '../../services/ventasService.js';
import { cerrarTurno, abrirTurno } from '../../services/cajaService.js';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const ESTADOS = {
  activa: { nombre: 'Completado', variante: 'success' },
  completado: { nombre: 'Completado', variante: 'success' },
  anulada: { nombre: 'Anulado', variante: 'danger' },
  anulado: { nombre: 'Anulado', variante: 'danger' },
  pendiente: { nombre: 'Pendiente', variante: 'warning' },
};

// Normaliza filas de venta del backend (id_venta, NUMERIC como string).
const normVenta = (v) => ({
  ...v,
  id: v.id_venta || v.id,
  total: Number(v.total) || 0,
  estado: v.estado === 'anulada' ? 'anulado' : v.estado === 'activa' ? 'completado' : v.estado,
});

export default function CajaPage() {
  const [turnos, setTurnos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [errorAbrir, setErrorAbrir] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [turnosData, ventasData] = await Promise.all([
          listarTurnos(),
          listarVentas(),
        ]);
        setTurnos(turnosData || []);
        setVentas((ventasData || []).map(normVenta));
      } catch (err) {
        setError('No se pudieron cargar los datos de caja');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const turnoActivo = turnos.find((t) => t.estado === 'abierto') || null;

  const turnoActivoId = turnoActivo?.id_turno || turnoActivo?.id || null;
  const ventasTurno = turnoActivoId
    ? ventas.filter((v) => (v.turno_id || v.turnoId) === turnoActivoId)
    : [];

  const totalVentas = ventasTurno
    .filter((v) => v.estado !== 'anulado')
    .reduce((sum, v) => sum + (v.total || 0), 0);

  const handleCerrarTurno = async () => {
    if (!turnoActivo) return;
    setCerrando(true);
    try {
      await cerrarTurno(turnoActivoId, totalVentas);
      const turnosData = await listarTurnos();
      setTurnos(turnosData || []);
    } catch (err) {
      console.error('Error al cerrar turno:', err);
    } finally {
      setCerrando(false);
    }
  };

  const handleAbrirTurno = async () => {
    setErrorAbrir(null);
    setAbriendo(true);
    try {
      await abrirTurno(Number(montoInicial));
      setMontoInicial('');
      const turnosData = await listarTurnos();
      setTurnos(turnosData || []);
    } catch (err) {
      setErrorAbrir(err.message);
    } finally {
      setAbriendo(false);
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
                  <div className="fw-semibold">{turnoActivo.nombre || `Turno #${String(turnoActivoId).slice(0, 8)}`}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Estado</div>
                  <div className="fw-semibold">{turnoActivo.estado}</div>
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
                {errorAbrir && <div className="alert alert-danger">{errorAbrir}</div>}
                <div className="d-flex gap-2 justify-content-center mt-3">
                  <input
                    placeholder="monto inicial"
                    type="number"
                    min="0"
                    className="form-control"
                    style={{ maxWidth: '160px' }}
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    onClick={handleAbrirTurno}
                    disabled={abriendo || montoInicial === ''}
                  >
                    {abriendo ? 'Abriendo...' : 'Abrir'}
                  </Button>
                </div>
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
=======
import { abrirTurno, cerrarTurno, listarTurnos } from '../../services/cajaService.js';

export default function CajaPage() {
  const [turnos, setTurnos] = useState([]);
  const [montoInicial, setMontoInicial] = useState('');
  const [cierres, setCierres] = useState({});
  const [msg, setMsg] = useState('');

  const recargar = async () => {
    try { setTurnos(await listarTurnos()); }
    catch (e) { setMsg(`Error: ${e.message}`); }
  };
  useEffect(() => { recargar(); }, []);

  const abrir = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await abrirTurno(Number(montoInicial));
      setMsg('Turno abierto');
      setMontoInicial('');
      recargar();
    } catch (e2) { setMsg(`Error: ${e2.message}`); }
  };

  const cerrar = async (id) => {
    const monto = window.prompt('Efectivo real en caja:');
    if (monto === null) return;
    try {
      const r = await cerrarTurno(id, Number(monto));
      setCierres((c) => ({ ...c, [id]: r }));
      setMsg(`Turno cerrado. Diferencia: ${r.diferencia}`);
      recargar();
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };

  return (
    <div>
      <h2>Caja / Turnos</h2>
      {msg && <p className={msg.startsWith('Error') ? 'error' : 'ok'}>{msg}</p>}
      <div className="card">
        <h3>Abrir turno</h3>
        <form onSubmit={abrir}>
          <div className="row">
            <input type="number" min={0} step={0.01} placeholder="monto inicial" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} required />
            <button type="submit">Abrir</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h3>Turnos</h3>
        <table>
          <thead><tr><th>Apertura</th><th>Inicial</th><th>Estado</th><th>Diferencia</th><th></th></tr></thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id_turno}>
                <td>{new Date(t.fecha_apertura).toLocaleString()}</td>
                <td>{t.monto_inicial}</td>
                <td>{t.estado}</td>
                <td>{t.diferencia ?? '—'}</td>
                <td>
                  {t.estado === 'abierto' && <button onClick={() => cerrar(t.id_turno)}>Cerrar</button>}
                  {cierres[t.id_turno] && <small> alerta: {cierres[t.id_turno].alertaGenerada ? 'sí' : 'no'}</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
>>>>>>> origin/feature/Airton-auxilio
  );
}
