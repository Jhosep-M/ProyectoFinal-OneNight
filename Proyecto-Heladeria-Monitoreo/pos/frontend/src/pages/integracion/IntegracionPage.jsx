import { useEffect, useState } from 'react';
import { listarCola, reintentarCola } from '../../services/integracionService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Select from '../../components/common/Select.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';

// Estados reales de cola_integracion (DDL chk_cola_estado):
// pendiente | procesando | enviado | error
const TONE_ESTADO = {
  pendiente: 'warning',
  procesando: 'info',
  enviado: 'success',
  error: 'error',
};

export default function IntegracionPage() {
  const [cola, setCola] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('');
  const [alert, setAlert] = useState(null);

  const recargar = async () => {
    setLoading(true);
    try {
      const r = await listarCola({ estado, limit: 100 });
      setCola(r.data || []);
      setTotal(r.total || 0);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { recargar(); }, [estado]);

  const reintentar = async (id) => {
    setAlert(null);
    try {
      await reintentarCola(id);
      setAlert({ tone: 'success', message: 'Reintento programado' });
      recargar();
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    }
  };

  return (
    <div>
      <h1>Integración POS → Monitoreo</h1>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <Card>
        <div className="row-inline">
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ width: 160 }}>
            <option value="">todos</option>
            <option value="pendiente">pendiente</option>
            <option value="procesando">procesando</option>
            <option value="enviado">enviado</option>
            <option value="error">error</option>
          </Select>
          <span>Total: {total}</span>
        </div>
      </Card>

      <Card title="Cola de integración">
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Recurso</th><th>Cantidad</th><th>Estado</th><th>Intentos</th><th>Próximo intento</th><th></th></tr>
            </thead>
            <tbody>
              {cola.map((c) => (
                <tr key={c.id_cola}>
                  <td>{c.tipo_recurso}</td>
                  <td>{c.cantidad} {c.unidad_medida}</td>
                  <td><Badge tone={TONE_ESTADO[c.estado] || 'neutral'}>{c.estado}</Badge></td>
                  <td>{c.intentos}</td>
                  <td>{c.proximo_intento ? new Date(c.proximo_intento).toLocaleString() : '—'}</td>
                   <td>
                     <RequirePermiso permiso="integracion.gestionar">
                       {(c.estado === 'error' || c.estado === 'pendiente') && (
                         <Button size="sm" variant="secondary" onClick={() => reintentar(c.id_cola)}>Reintentar</Button>
                       )}
                     </RequirePermiso>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
