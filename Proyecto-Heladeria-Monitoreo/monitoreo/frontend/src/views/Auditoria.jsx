import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listar } from '../services/auditoriaService';

export default function Auditoria() {
  const { orgSeleccionada } = useAuth();
  const [data, setData] = useState({ data: [], total: 0 });
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    setCargando(true);
    setError(null);
    try {
      setData(await listar({ organizacionId: orgSeleccionada }));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [orgSeleccionada]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <section>
      <h2>Auditoría ({data.total ?? 0})</h2>
      {error && <p className="error">{error}</p>}
      {cargando && <p className="cargando">Cargando...</p>}
      {data.pendienteBackend && <p className="toast">Endpoint de auditoría pendiente en backend. Vista lista, solo lectura.</p>}
      <table className="tabla">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
        <tbody>
          {(data.data ?? []).map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at ?? r.fecha ?? r.createdAt).toLocaleString('es')}</td>
              <td>{r.usuario ?? r.user_email ?? '-'}</td>
              <td>{r.accion ?? r.action ?? '-'}</td>
              <td>{r.detalle ?? r.detail ?? '-'}</td>
            </tr>
          ))}
          {(data.data ?? []).length === 0 && !cargando && !error && <tr><td colSpan="4">Sin registros</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
