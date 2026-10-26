import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { listarMesas, verMesa, crearMesa, actualizarMesa, eliminarMesa } from '../../services/mesasService.js';
import { formatCurrency } from '../../utils/format.js';
import { useAutoRefresh } from '../../hooks/useAutoRefresh.js';
import ConfirmDialog from '../../components/modals/ConfirmDialog.jsx';

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

// Normaliza filas del backend (mesa + cuenta operativa) al shape de la UI.
// Backend expone: pedidos_abiertos, cuenta_total, mesero_nombre, abierto_desde + pedidos[].total
const normMesa = (m) => ({
  ...m,
  id: m.id_mesa || m.id,
  numero: m.numero ?? m.nombre ?? m.id,
  estado: m.estado === 'disponible' ? 'libre' : m.estado,
  pedidos_abiertos: Number(m.pedidos_abiertos ?? m.pedidosAbiertos ?? (Array.isArray(m.pedidos) ? m.pedidos.length : 0)) || 0,
  cuenta_total: Number(m.cuenta_total ?? m.cuentaTotal ?? 0) || 0,
  mesero_nombre: m.mesero_nombre ?? m.meseroNombre ?? null,
  abierto_desde: m.abierto_desde ?? m.abiertoDesde ?? null,
  pedidos: Array.isArray(m.pedidos)
    ? m.pedidos.map((p) => ({ ...p, total: Number(p.total ?? 0) || 0 }))
    : undefined,
});

const minutosDesde = (fecha) => {
  if (!fecha) return null;
  const ms = Date.now() - new Date(fecha).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.floor(ms / 60000);
};

const formatoTiempo = (fecha) => {
  const min = minutosDesde(fecha);
  if (min == null) return null;
  if (min < 1) return 'recién';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
};

const BORDE_POR_ESTADO = {
  libre: 'border-success',
  ocupada: 'border-danger',
  reservada: 'border-warning',
};

export default function MesasPage() {
  const navigate = useNavigate();
  const outlet = useOutletContext();
  const setHeaderOverride = outlet?.setHeaderOverride;
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accionError, setAccionError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [creando, setCreando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

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

  // Regla de refresco automático: la ocupación/cuenta cambia al crear o cobrar
  // pedidos en Pedidos/Mesero/Ventas. Poll silencioso (sin skeleton) + foco.
  useAutoRefresh(async () => {
    try {
      const data = await listarMesas();
      setMesas((data || []).map(normMesa));
      setError(null);
    } catch {
      /* conserva la vista actual; el error inicial ya se muestra */
    }
  }, { intervalMs: 15000, onFocus: true });

  const mesasFiltradas = filtro === 'todas'
    ? mesas
    : mesas.filter((m) => m.estado === filtro || (filtro === 'libre' && m.estado === 'disponible'));

  const conteos = {
    todas: mesas.length,
    libre: mesas.filter((m) => m.estado === 'libre').length,
    ocupada: mesas.filter((m) => m.estado === 'ocupada').length,
    reservada: mesas.filter((m) => m.estado === 'reservada').length,
  };

  // Header operativo: X/Y ocupadas · Bs por cobrar.
  useEffect(() => {
    if (!setHeaderOverride) return;
    if (loading) {
      setHeaderOverride({ breadcrumb: 'Cargando mesas…' });
      return;
    }
    if (error) {
      setHeaderOverride({ breadcrumb: 'No se pudieron cargar las mesas' });
      return;
    }
    if (mesas.length === 0) {
      setHeaderOverride({ breadcrumb: 'Sin mesas registradas' });
      return;
    }
    const ocupadas = mesas.filter((m) => m.estado === 'ocupada').length;
    const porCobrar = mesas.reduce((acc, m) => acc + (Number(m.cuenta_total) || 0), 0);
    const base = `${ocupadas}/${mesas.length} mesas ocupadas`;
    setHeaderOverride({ breadcrumb: porCobrar > 0 ? `${base} · ${formatCurrency(porCobrar)} por cobrar` : base });
    return () => setHeaderOverride(null);
  }, [mesas, loading, error, setHeaderOverride]);

  const handleSeleccionarMesa = async (mesa) => {
    setAccionError(null);
    setMesaSeleccionada(mesa);
    try {
      const detalle = await verMesa(mesa.id_mesa || mesa.id);
      if (detalle) {
        const norm = normMesa(detalle);
        setMesaSeleccionada((prev) => ({
          ...norm,
          // Conserva operativos del listado si el detalle no los trae.
          pedidos_abiertos: detalle.pedidos_abiertos ?? mesa.pedidos_abiertos ?? norm.pedidos_abiertos,
          cuenta_total: detalle.cuenta_total ?? mesa.cuenta_total ?? norm.cuenta_total,
          mesero_nombre: detalle.mesero_nombre ?? mesa.mesero_nombre ?? norm.mesero_nombre,
          abierto_desde: detalle.abierto_desde ?? mesa.abierto_desde ?? norm.abierto_desde,
        }));
        // Refresca cuenta del listado sin recargar todo.
        setMesas((prev) => prev.map((x) => ((x.id_mesa || x.id) === (mesa.id_mesa || mesa.id)
          ? { ...x, pedidos: norm.pedidos ?? x.pedidos, cuenta_total: norm.pedidos?.reduce((a, p) => a + (Number(p.total) || 0), 0) ?? x.cuenta_total }
          : x)));
      }
    } catch {
      // ya tenemos los datos básicos
    }
  };

  const handleNuevaMesa = async () => {
    setAccionError(null);
    setCreando(true);
    try {
      // El backend exige numero entero único: usar max+1, no "Mesa 01".
      const maxNumero = mesas.reduce((max, m) => Math.max(max, Number(m.numero) || 0), 0);
      const nueva = await crearMesa(maxNumero + 1);
      if (nueva) {
        setMesas((prev) => [...prev, normMesa(nueva)]);
      }
    } catch (err) {
      setAccionError(err?.message || 'No se pudo crear la mesa (¿número duplicado?)');
    } finally {
      setCreando(false);
    }
  };

  const handleCambiarEstado = async (estado) => {
    if (!mesaSeleccionada || cambiandoEstado) return;
    setAccionError(null);
    setCambiandoEstado(true);
    try {
      const id = mesaSeleccionada.id_mesa || mesaSeleccionada.id;
      const actualizada = await actualizarMesa(id, { estado });
      const norm = {
        ...normMesa(actualizada),
        pedidos_abiertos: actualizada.pedidos_abiertos ?? mesaSeleccionada.pedidos_abiertos ?? 0,
        cuenta_total: actualizada.cuenta_total ?? mesaSeleccionada.cuenta_total ?? 0,
        mesero_nombre: actualizada.mesero_nombre ?? mesaSeleccionada.mesero_nombre ?? null,
        abierto_desde: actualizada.abierto_desde ?? mesaSeleccionada.abierto_desde ?? null,
        pedidos: actualizada.pedidos ?? mesaSeleccionada.pedidos,
      };
      setMesas((prev) => prev.map((m) => ((m.id_mesa || m.id) === id ? { ...m, ...norm } : m)));
      setMesaSeleccionada((prev) => ({ ...prev, ...norm }));
    } catch (err) {
      setAccionError(err?.message || 'No se pudo cambiar el estado de la mesa');
    } finally {
      setCambiandoEstado(false);
    }
  };

  const mesaId = mesaSeleccionada?.id_mesa || mesaSeleccionada?.id;
  const cuentaSeleccionada = mesaSeleccionada?.pedidos?.reduce((a, p) => a + (Number(p.total) || 0), 0)
    ?? mesaSeleccionada?.cuenta_total ?? 0;
  const tiempoSeleccionado = formatoTiempo(mesaSeleccionada?.abierto_desde || mesaSeleccionada?.pedidos?.[0]?.fecha);
  // Guard de UI (el backend también lo exige con 409): con pedidos
  // abiertos o cuenta pendiente no se puede liberar sin cobrar.
  const pedidosAbiertosSel = Number(mesaSeleccionada?.pedidos_abiertos ?? mesaSeleccionada?.pedidos?.length ?? 0) || 0;
  const cuentaSel = Number(mesaSeleccionada?.cuenta_total) || cuentaSeleccionada || 0;
  const tieneCuentaPendiente = pedidosAbiertosSel > 0 || cuentaSel > 0;

  const handleEliminarMesa = () => {
    if (!mesaSeleccionada || eliminando) return;
    setConfirmEliminar(true);
  };

  const ejecutarEliminarMesa = async () => {
    if (!mesaSeleccionada || eliminando) return;
    setConfirmEliminar(false);
    setAccionError(null);
    setEliminando(true);
    try {
      await eliminarMesa(mesaId);
      setMesas((prev) => prev.filter((m) => (m.id_mesa || m.id) !== mesaId));
      setMesaSeleccionada(null);
    } catch (err) {
      setAccionError(err?.message || 'No se pudo eliminar la mesa');
    } finally {
      setEliminando(false);
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
      <div className="d-flex flex-column gap-2">
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{error}</span>
        </div>
        <div>
          <Button variant="primary" icon="bi-arrow-clockwise" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Flujo simplificado: solo Libre / Ocupada. 'reservada' se conserva en el
  // backend por datos viejos pero ya no se ofrece en la UI.
  const FILTROS = [
    { key: 'todas', label: 'Todas' },
    { key: 'libre', label: 'Libre' },
    { key: 'ocupada', label: 'Ocupada' },
  ];

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-8">
        {accionError && (
          <div className="alert alert-warning d-flex align-items-center gap-2" role="alert">
            <i className="bi bi-exclamation-triangle"></i>
            <span>{accionError}</span>
          </div>
        )}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2 flex-wrap">
            {FILTROS.map((f) => (
              <button
                key={f.key}
                className={`btn btn-sm ${filtro === f.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFiltro(f.key)}
              >
                {f.label} ({conteos[f.key] ?? 0})
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
              <p className="mt-2">{mesas.length === 0 ? 'Sin mesas registradas. Crea la primera con Nueva Mesa.' : 'No hay mesas con este filtro'}</p>
            </div>
          ) : (
            mesasFiltradas.map((m) => (
              <div key={m.id} className="col-6 col-md-4 col-xl-3">
                <motion.div variants={item}>
                  <Card
                    className={`h-100 ${mesaSeleccionada?.id === m.id ? 'border-primary' : BORDE_POR_ESTADO[m.estado] || ''}`}
                    hover={false}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSeleccionarMesa(m)}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h6 className="mb-0 fs-5 fw-bold" style={{ fontFamily: 'var(--bs-font-serif)' }}>
                        <i className="bi bi-grid me-1"></i>
                        {m.numero ?? `Mesa ${m.id}`}
                      </h6>
                      <Badge variant={ESTADOS_MESA[m.estado]?.variante || 'secondary'}>
                        {ESTADOS_MESA[m.estado]?.nombre || m.estado}
                      </Badge>
                    </div>
                    <div className="fw-bold tabular-nums" style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>
                      {m.cuenta_total > 0 ? formatCurrency(m.cuenta_total) : 'Sin cuenta'}
                    </div>
                    <div className="text-muted small">
                      {m.pedidos_abiertos > 0 ? `${m.pedidos_abiertos} pedido(s)` : 'Sin pedidos abiertos'}
                      {m.mesero_nombre ? ` · ${m.mesero_nombre}` : ''}
                      {formatoTiempo(m.abierto_desde) ? ` · ${formatoTiempo(m.abierto_desde)}` : ''}
                    </div>
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
            <div className="d-flex justify-content-between align-items-start mb-1">
              <h5 className="mb-0" style={{ fontFamily: 'var(--bs-font-serif)' }}>
                Mesa {mesaSeleccionada.numero ?? mesaSeleccionada.id}
              </h5>
              <Badge variant={ESTADOS_MESA[mesaSeleccionada.estado]?.variante || 'secondary'}>
                {ESTADOS_MESA[mesaSeleccionada.estado]?.nombre || mesaSeleccionada.estado}
              </Badge>
            </div>
            <div className="text-muted small mb-2">
              {mesaSeleccionada.mesero_nombre ? `Mesero: ${mesaSeleccionada.mesero_nombre}` : 'Sin mesero asignado'}
              {tiempoSeleccionado ? ` · Abierta hace ${tiempoSeleccionado}` : ''}
            </div>

            <div className="d-flex justify-content-between align-items-center p-2 rounded mb-3" style={{ background: '#F7F1E6' }}>
              <span className="text-muted small">Cuenta actual</span>
              <span className="fw-bold fs-5 tabular-nums" style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(cuentaSeleccionada)}
              </span>
            </div>

            <div style={{ borderTop: '1px dotted #D4C4B0' }} className="pt-3 mb-3"></div>

            <div className="mb-3">
              <div className="text-muted small mb-1">Pedidos abiertos ({mesaSeleccionada.pedidos?.length ?? mesaSeleccionada.pedidos_abiertos ?? 0})</div>
              {mesaSeleccionada.pedidos && mesaSeleccionada.pedidos.length > 0 ? (
                <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
                  {mesaSeleccionada.pedidos.slice(0, 5).map((p) => (
                    <li key={p.id_pedido || p.id} className="d-flex justify-content-between small border rounded px-2 py-1">
                      <span>
                        <i className="bi bi-receipt me-1"></i>
                        {p.mesero_nombre ? `${p.mesero_nombre} · ` : ''}{p.estado || 'abierto'}
                      </span>
                      <span className="fw-semibold">{formatCurrency(p.total || 0)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted small">Sin pedidos abiertos — crea uno para empezar la cuenta.</div>
              )}
            </div>

            <div className="d-grid gap-2">
              <Button variant="primary" icon="bi-plus-lg" onClick={() => navigate(`/pedidos?mesa=${mesaId}`)}>Nuevo pedido</Button>
              <Button variant="secondary" icon="bi-receipt" onClick={() => navigate(`/pedidos?mesa=${mesaId}`)}>Ver cuenta</Button>
              <div className="text-muted small mb-1">La mesa se ocupa al crear un pedido y se libera al cobrar el último. Solo usa esto en casos excepcionales.</div>
              {tieneCuentaPendiente && (
                <div className="alert alert-warning py-1 px-2 small mb-1" role="alert">
                  Cobra la cuenta antes de liberar.
                </div>
              )}
              <div className="d-flex gap-2">
                <Button variant="secondary" icon="bi-person" onClick={() => handleCambiarEstado('ocupada')} disabled={cambiandoEstado}>Ocupar</Button>
                <Button variant="danger" icon="bi-x-lg" onClick={() => handleCambiarEstado('libre')} disabled={cambiandoEstado || tieneCuentaPendiente}>Liberar</Button>
              </div>
              <Button variant="dangerOutline" icon="bi-trash" onClick={handleEliminarMesa} disabled={eliminando || cambiandoEstado}>
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmEliminar}
        onClose={() => setConfirmEliminar(false)}
        onConfirm={ejecutarEliminarMesa}
        title="Eliminar mesa"
        message={`¿Eliminar la mesa ${mesaSeleccionada?.numero ?? mesaId}? Solo se puede eliminar sin pedidos abiertos ni cuenta pendiente.`}
        confirmText="Eliminar"
        danger
      />
    </div>
  );
}
