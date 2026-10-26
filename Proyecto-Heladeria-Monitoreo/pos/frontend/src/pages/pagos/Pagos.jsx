import { useEffect, useState } from 'react';
import Card from '../../components/common/Card.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import { listarMetodosAdmin, crearMetodo, actualizarMetodo } from '../../services/pagosService.js';

// HU-20 — Catálogo simple de métodos de pago: lista activos, crear, desactivar.
// Sin hardcode de familias tipográficas (AGENTS §15.1).
export default function Pagos() {
  const [metodos, setMetodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      setMetodos((await listarMetodosAdmin()) || []);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los métodos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crear = async (e) => {
    e.preventDefault();
    setResultado(null);
    if (nombre.trim().length < 2) {
      setResultado({ tone: 'error', message: 'El nombre debe tener al menos 2 caracteres.' });
      return;
    }
    setCreando(true);
    try {
      await crearMetodo(nombre.trim());
      setNombre('');
      setResultado({ tone: 'success', message: 'Método creado.' });
      cargar();
    } catch (err) {
      setResultado({ tone: 'error', message: err.message || 'No se pudo crear el método.' });
    } finally {
      setCreando(false);
    }
  };

  const desactivar = async (m) => {
    const id = m.id_metodo_pago || m.id;
    setResultado(null);
    try {
      await actualizarMetodo(id, 'inactivo');
      setResultado({ tone: 'success', message: `Método "${m.nombre}" desactivado.` });
      cargar();
    } catch (err) {
      setResultado({ tone: 'error', message: err.message || 'No se pudo desactivar.' });
    }
  };

  return (
    <div>
      <h1>Métodos de pago</h1>
      <p className="text-muted">Catálogo de métodos aceptados en ventas.</p>
      {error && <Alert tone="error" message={error} />}
      {resultado && <Alert tone={resultado.tone} message={resultado.message} />}

      <Card title="Nuevo método">
        <form onSubmit={crear}>
          <div className="filters-grid">
            <Input placeholder="Ej. QR, Tarjeta" aria-label="Nombre del método" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Button type="submit" disabled={creando}>{creando ? 'Creando…' : 'Crear método'}</Button>
          </div>
        </form>
      </Card>

      <Card title={`Métodos activos (${metodos.length})`}>
        {loading ? (
          <div className="d-flex flex-column gap-2"><Skeleton height={36} /><Skeleton height={36} /></div>
        ) : metodos.length === 0 ? (
          <EmptyState title="Sin métodos" description="Crea el primero con el formulario de arriba." />
        ) : (
          <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {metodos.map((m) => (
                <tr key={m.id_metodo_pago || m.id}>
                  <td>{m.nombre}</td>
                  <td><Badge tone="success">{m.estado || 'activo'}</Badge></td>
                  <td>
                    <Button size="sm" variant="secondary" onClick={() => desactivar(m)}>
                      Desactivar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
