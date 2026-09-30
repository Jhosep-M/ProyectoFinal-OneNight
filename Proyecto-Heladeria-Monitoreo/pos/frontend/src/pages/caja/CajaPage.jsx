import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatCurrency, formatTime } from '../../utils/format.js';
import { listarMisTurnos } from '../../services/cajaService.js';
import { listarVentas } from '../../services/ventasService.js';
import { cerrarTurno, abrirTurno } from '../../services/cajaService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import CerrarTurnoModal from './CerrarTurnoModal.jsx';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
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
  const { session } = useAuth ? useAuth() : { session: null };
  const [misTurnos, setMisTurnos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const [modalPropio, setModalPropio] = useState(false);
  const [errorCerrar, setErrorCerrar] = useState(null);
  const [montoInicial, setMontoInicial] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [errorAbrir, setErrorAbrir] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const copiarId = async (id) => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  };

  // Solo mío: Caja nunca llama a /todos ni /permisos (ver TurnosAdminPage).
  const recargar = async () => {
    const [misData, ventasData] = await Promise.all([
      listarMisTurnos(),
      listarVentas(),
    ]);
    setMisTurnos(misData || []);
    setVentas((ventasData || []).map(normVenta));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await recargar();
      } catch (err) {
        setError('No se pudieron cargar los datos de caja');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const id = setInterval(() => { recargar().catch(() => {}); }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opción A: mi turno activo (nunca un ajeno).
  const turnoActivo = misTurnos.find((t) => t.estado === 'abierto') || null;

  const turnoActivoId = turnoActivo?.id_turno || turnoActivo?.id || null;
  const ventasTurno = turnoActivoId
    ? ventas.filter((v) => (v.turno_id || v.turnoId) === turnoActivoId)
    : [];

  const totalVentas = ventasTurno
    .filter((v) => v.estado !== 'anulado')
    .reduce((sum, v) => sum + (v.total || 0), 0);

  const nombreCajero = (t) =>
    t?.cajero_email || t?.cajero || t?.usuario || t?.usuario_email || session?.user?.email || '—';

  const handleConfirmarCierrePropio = async ({ monto_final_real }) => {
    if (!turnoActivo || !turnoActivoId) return;
    setCerrando(true);
    setErrorCerrar(null);
    try {
      await cerrarTurno(turnoActivoId, { monto_final_real });
      setModalPropio(false);
      await recargar();
    } catch (err) {
      const msg = String(err.message || '');
      if (/409|abierto|ya cerrado/i.test(msg)) {
        setErrorCerrar('El turno ya fue cerrado. Actualizando…');
        await recargar();
      } else {
        setErrorCerrar(msg || 'No se pudo cerrar el turno');
      }
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
      await recargar();
    } catch (err) {
      setErrorAbrir(err.message);
    } finally {
      setAbriendo(false);
    }
  };

  if (loading) {
    return (
      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-5 col-xl-4">
          <Card className="h-100 p-3 p-lg-4">
            <Skeleton height="300px" />
          </Card>
        </div>
        <div className="col-12 col-lg-7 col-xl-8">
          <Card className="h-100 p-3 p-lg-4">
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
    <motion.div className="row g-4 align-items-start" variants={container} initial="hidden" animate="show">
      <div className="col-12 col-lg-5 col-xl-4">
        <motion.div variants={item} className="caja-turno-sticky">
          <Card className="h-100 p-3 p-lg-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Turno Actual
              </h5>
              {turnoActivo ? (
                <Badge variant="success">Abierto</Badge>
              ) : (
                <Badge variant="accent">Sin turno</Badge>
              )}
            </div>
            {turnoActivo ? (
              <>
                <div className="mb-3">
                  <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.6875rem', letterSpacing: '0.05em' }}>Turno</div>
                  <div className="fw-semibold">{turnoActivo.nombre || `Turno #${String(turnoActivoId).slice(0, 8)}`}</div>
                  <div className="text-muted small">
                    Apertura {formatTime(turnoActivo.fecha_apertura || turnoActivo.created_at)}
                    {' · '}Cajero {nombreCajero(turnoActivo)}
                    {' · '}{turnoActivo.estado} · tuyo
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <code className="small text-muted">{String(turnoActivoId).slice(0, 8)}…</code>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary py-0"
                      onClick={() => copiarId(turnoActivoId)}
                      title="Copiar UUID completo del turno (soporte/API). En Ventas no necesitas pegarlo, se detecta solo."
                    >
                      {copiado ? 'Copiado' : 'Copiar ID'}
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #D4C4B0' }} className="pt-3 mb-3"></div>

                <div className="kpi-grid mb-3">
                  <div className="kpi">
                    <div className="kpi-label">Ventas</div>
                    <div className="kpi-value kpi-value-accent">
                      {formatCurrency(totalVentas)}
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Transacciones</div>
                    <div className="kpi-value">{ventasTurno.length}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Ticket promedio</div>
                    <div className="kpi-value">
                      {ventasTurno.length > 0 ? formatCurrency(totalVentas / ventasTurno.length) : formatCurrency(0)}
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Efectivo en caja</div>
                    <div className="kpi-value">{formatCurrency(turnoActivo.monto_inicial || 0)}</div>
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    icon="bi-lock"
                    onClick={() => { setErrorCerrar(null); setModalPropio(true); }}
                    loading={cerrando}
                  >
                    {cerrando ? 'Cerrando...' : 'Cerrar Turno'}
                  </Button>
                  <span className="text-muted small text-center">Quedará registrado en auditoría con tu usuario y hora.</span>
                </div>
                <CerrarTurnoModal
                  abierto={modalPropio}
                  esAjeno={false}
                  cargando={cerrando}
                  error={errorCerrar}
                  onCancelar={() => { setModalPropio(false); setErrorCerrar(null); }}
                  onConfirmar={handleConfirmarCierrePropio}
                />
              </>
            ) : (
              <div className="py-2">
                <div className="turno-empty-icon mb-3" aria-hidden="true">
                  <i className="bi bi-clock"></i>
                </div>
                <p className="fw-semibold text-center mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.05rem' }}>No hay un turno activo</p>
                <p className="text-muted small text-center mb-3 mx-auto" style={{ maxWidth: '30ch' }}>
                  Abre el turno para empezar a vender. Se registrará con tu usuario y la hora actual.
                </p>
                {errorAbrir && <div className="alert alert-danger py-2 small" role="alert">{errorAbrir}</div>}
                <form
                  className="d-grid gap-2 mt-1"
                  onSubmit={(e) => { e.preventDefault(); handleAbrirTurno(); }}
                >
                  <label htmlFor="monto-inicial" className="form-label small fw-semibold mb-0">
                    Monto inicial
                  </label>
                  <div className="input-group">
                    <span className="input-group-text" aria-hidden="true">$</span>
                    <input
                      id="monto-inicial"
                      placeholder="monto inicial"
                      aria-label="Monto inicial"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="form-control"
                      value={montoInicial}
                      onChange={(e) => setMontoInicial(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={abriendo}
                    disabled={montoInicial === ''}
                  >
                    {abriendo ? 'Abriendo...' : 'Abrir'}
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <div className="col-12 col-lg-7 col-xl-8">
        <motion.div variants={item}>
          <Card className="h-100 p-3 p-lg-4 caja-transacciones">
            <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
              <h5 className="mb-0" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Transacciones del Turno
              </h5>
              <Badge variant="accent">{ventasTurno.length} transacciones</Badge>
            </div>

            {ventasTurno.length === 0 ? (
              <EmptyState
                icon="bi-receipt"
                title="Sin movimientos todavía"
                description="Las ventas de este turno aparecerán aquí automáticamente."
              />
            ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Hora</th>
                    <th scope="col" className="text-end">Monto</th>
                    <th scope="col" className="text-end">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasTurno.map((v) => (
                    <tr key={v.id}>
                      <td className="fw-semibold">#{String(v.id).slice(0, 8)}</td>
                      <td className="text-muted">{formatTime(v.fecha || v.created_at)}</td>
                      <td className="fw-semibold text-end">{formatCurrency(v.total || 0)}</td>
                      <td className="text-end">
                        <Badge variant={ESTADOS[v.estado]?.variante || 'secondary'}>
                          {ESTADOS[v.estado]?.nombre || v.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            <div
              className="d-flex justify-content-between align-items-center mt-3 pt-3 flex-wrap gap-2"
              style={{ borderTop: '1px dashed #D4C4B0' }}
            >
              <span className="text-muted small">
                Mostrando {ventasTurno.length} transacciones
              </span>
              <span className="d-flex align-items-baseline gap-2">
                <span className="text-muted small">Total cobrado</span>
                <span className="fw-bold" style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '1.25rem', color: '#6B4F0F', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(totalVentas)}
                </span>
              </span>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
