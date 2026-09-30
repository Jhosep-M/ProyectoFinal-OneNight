import { useCallback, useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Alert from '../../components/ui/Alert.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Input from '../../components/ui/Input.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
import { proveedoresService } from '../../services/inventarioService.js';

// Página propia de Proveedores (CRUD /api/v1/suppliers).
// Antes era un sub-export de Inventario.jsx; ahora vive aquí y aquel
// re-exporta por compatibilidad sin duplicar lógica.
const formVacio = { nombre: '', nit: '', contacto: '', telefono: '', correo: '', estado: 'activo' };

export default function Proveedores() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(formVacio);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await proveedoresService.list()) || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const editar = (p) => {
    setEditando(p.id_proveedor);
    setForm({
      nombre: p.nombre || '',
      nit: p.nit || '',
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      correo: p.correo || '',
      estado: p.estado || 'activo',
    });
    setError(null);
    setAviso(null);
  };

  const cancelar = () => {
    setEditando(null);
    setForm(formVacio);
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    setError(null);
    setAviso(null);
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        nit: form.nit.trim() || null,
        contacto: form.contacto.trim() || null,
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        ...(editando ? { estado: form.estado } : {}),
      };
      if (editando) {
        await proveedoresService.update(editando, payload);
        setAviso('Proveedor actualizado');
      } else {
        await proveedoresService.create(payload);
        setAviso('Proveedor creado');
      }
      cancelar();
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const inactivar = async (p) => {
    if (!window.confirm(`¿Inactivar al proveedor "${p.nombre}"?`)) return;
    setError(null);
    try {
      await proveedoresService.inactivate(p.id_proveedor);
      setAviso(`Proveedor "${p.nombre}" inactivado`);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const filtrados = items.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (p.nombre || '').toLowerCase().includes(q) || (p.nit || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="d-flex flex-column gap-3">
        <Skeleton height="36px" />
        <Skeleton height="200px" />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <h1>Proveedores</h1>
        <p className="text-muted">Alta, edición e inactivación de proveedores (NIT único).</p>
      </div>

      {error && <Alert variant="danger" icon="bi-exclamation-triangle-fill">{error}</Alert>}
      {aviso && <Alert variant="success" icon="bi-check-circle-fill">{aviso}</Alert>}

      <RequirePermiso permiso="inventario.movimiento">
        <Card>
          <h5 className="mb-3">{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</h5>
          <form onSubmit={guardar}>
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <Input label="Nombre" placeholder="Ej. Lácteos del Valle" value={form.nombre} onChange={set('nombre')} required />
              </div>
              <div className="col-12 col-md-6">
                <Input label="NIT (único)" placeholder="Ej. 123456789" value={form.nit} onChange={set('nit')} />
              </div>
              <div className="col-12 col-md-6">
                <Input label="Contacto" placeholder="Persona de contacto" value={form.contacto} onChange={set('contacto')} />
              </div>
              <div className="col-12 col-md-6">
                <Input label="Teléfono" placeholder="Ej. 70123456" value={form.telefono} onChange={set('telefono')} />
              </div>
              <div className="col-12 col-md-6">
                <Input label="Correo" type="email" placeholder="proveedor@ejemplo.com" value={form.correo} onChange={set('correo')} />
              </div>
              {editando && (
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="prov-estado">Estado</label>
                  <select id="prov-estado" className="form-select" value={form.estado} onChange={set('estado')}>
                    <option value="activo">activo</option>
                    <option value="inactivo">inactivo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="d-flex gap-2 mt-2">
              <Button type="submit" variant="primary" icon={editando ? 'bi-save' : 'bi-plus'} loading={guardando}>
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear proveedor'}
              </Button>
              {editando && <Button type="button" variant="ghost" onClick={cancelar}>Cancelar</Button>}
            </div>
          </form>
        </Card>
      </RequirePermiso>

      <Card>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Proveedores ({filtrados.length})</h5>
          <input
            className="form-control"
            style={{ maxWidth: 260 }}
            placeholder="Buscar por nombre o NIT…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar proveedores"
          />
        </div>
        {filtrados.length === 0 ? (
          <EmptyState
            title={busqueda ? 'Sin resultados' : 'Sin proveedores'}
            description={busqueda ? 'Prueba con otro nombre o NIT.' : 'Crea el primer proveedor con el formulario de arriba.'}
          />
        ) : (
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>NIT</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id_proveedor}>
                  <td>{p.nombre}</td>
                  <td>{p.nit || '—'}</td>
                  <td>{p.contacto || '—'}</td>
                  <td>{p.telefono || '—'}</td>
                  <td>{p.correo || '—'}</td>
                  <td><Badge variant={p.estado === 'activo' ? 'success' : 'neutral'}>{p.estado}</Badge></td>
                  <td>
                    <RequirePermiso permiso="inventario.movimiento" fallback={null}>
                      <Button size="sm" variant="outlineSecondary" onClick={() => editar(p)}>Editar</Button>{' '}
                      {p.estado === 'activo' && (
                        <Button size="sm" variant="ghost" onClick={() => inactivar(p)}>Inactivar</Button>
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
