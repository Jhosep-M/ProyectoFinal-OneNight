import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatTime } from '../../utils/format.js';
import { listarTodosTurnos, obtenerPermisosTurno, cerrarTurno } from '../../services/cajaService.js';
import CerrarTurnoModal from '../caja/CerrarTurnoModal.jsx';

/**
 * Opción 1: ver todos (admin/supervisor vía turno.consultar.todos),
 * cerrar ajenos solo admin (turno.cerrar.todos + motivo).
 * Caja queda "solo mío"; esta página es la única con visión global.
 */
export default function TurnosAdminPage() {
  const [turnos, setTurnos] = useState([]);
  const [permisos, setPermisos] = useState({ puedeCerrarTodos: false, puedeConsultarTodos: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const [objetivo, setObjetivo] = useState(null);
  const [errorCerrar, setErrorCerrar] = useState(null);

  const recargar = async () => {
    const perm = await obtenerPermisosTurno();
    setPermisos(perm || { puedeCerrarTodos: false, puedeConsultarTodos: false });
    const todos = await listarTodosTurnos();
    setTurnos(todos || []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await recargar();
      } catch (e) {
        setError(String(e.message || 'No se pudieron cargar los turnos'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConfirmar = async ({ monto_final_real, motivo }) => {
    const id = objetivo?.id_turno || objetivo?.id;
    if (!objetivo || !id) return;
    setCerrando(true);
    setErrorCerrar(null);
    try {
      await cerrarTurno(id, { monto_final_real, motivo });
      setObjetivo(null);
      await recargar();
    } catch (e) {
      const msg = String(e.message || '');
      if (/403|ajeno|Forbidden/i.test(msg)) {
        setErrorCerrar('Solo un administrador puede cerrar turnos ajenos.');
      } else if (/409|abierto|ya cerrado/i.test(msg)) {
        setErrorCerrar('El turno ya fue cerrado. Actualizando…');
        await recargar();
      } else {
        setErrorCerrar(msg || 'No se pudo cerrar el turno');
      }
    } finally {
      setCerrando(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-3 p-lg-4">
        <Skeleton height="300px" />
      </Card>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">{error}</div>
    );
  }

  const abiertos = turnos.filter((t) => t.estado === 'abierto');

  return (
    <Card className="p-3 p-lg-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h5 className="mb-0">Turnos — todas las cajas</h5>
        <Badge variant="accent">{abiertos.length} abiertos · {turnos.length} total</Badge>
      </div>
      <p className="text-muted small">
        Visión global solo lectura. El cierre de turnos ajenos está reservado al administrador (con motivo obligatorio).
        El supervisor ve pero no cierra.
      </p>
      {turnos.length === 0 ? (
        <EmptyState icon="bi-clock" title="Sin turnos" description="Aún no hay turnos registrados." />
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Turno</th>
                <th>Cajero</th>
                <th>Apertura</th>
                <th>Estado</th>
                <th className="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => {
                const id = t.id_turno || t.id;
                const cajero = t.cajero_email || t.cajero || t.usuario || '—';
                const esAbierto = t.estado === 'abierto';
                return (
                  <tr key={id}>
                    <td className="fw-semibold">#{String(id).slice(0, 8)}</td>
                    <td className="text-muted">{cajero}</td>
                    <td className="text-muted">{formatTime(t.fecha_apertura || t.created_at)}</td>
                    <td>
                      <Badge variant={esAbierto ? 'success' : 'secondary'}>{t.estado}</Badge>
                    </td>
                    <td className="text-end">
                      {esAbierto && permisos.puedeCerrarTodos ? (
                        <Button
                          variant="outlineSecondary"
                          size="sm"
                          icon="bi-lock"
                          onClick={() => { setObjetivo(t); setErrorCerrar(null); }}
                        >
                          Cerrar como admin
                        </Button>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <CerrarTurnoModal
        abierto={!!objetivo}
        esAjeno
        cargando={cerrando}
        error={errorCerrar}
        onCancelar={() => { setObjetivo(null); setErrorCerrar(null); }}
        onConfirmar={handleConfirmar}
      />
    </Card>
  );
}
