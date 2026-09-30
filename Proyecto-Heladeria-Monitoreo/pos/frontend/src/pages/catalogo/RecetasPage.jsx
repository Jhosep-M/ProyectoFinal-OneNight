import { useEffect, useMemo, useState } from 'react';
import { productosService } from '../../services/productosService.js';
import { inventarioService } from '../../services/inventarioService.js';
import { recetasService } from '../../services/recetasService.js';
import { resolveProductoImagen } from '../../utils/productoImagen.js';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import RecetaPanel from './components/RecetaPanel.jsx';

export default function RecetasPage() {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [conteo, setConteo] = useState({}); // producto_id -> n insumos
  const [loading, setLoading] = useState(true);
  const [loadingReceta, setLoadingReceta] = useState(false);
  const [apiRecetas, setApiRecetas] = useState(true);
  const [alert, setAlert] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const recargarBase = async () => {
    setLoading(true);
    try {
      const [prods, ins] = await Promise.all([
        productosService.list(),
        inventarioService.insumos().catch(() => []),
      ]);
      setProductos(prods || []);
      setInsumos(ins || []);
      if (!selectedId && (prods || []).length > 0) setSelectedId(prods[0].id_producto);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const cargarReceta = async (productoId) => {
    if (!productoId) return;
    setLoadingReceta(true);
    try {
      const rows = await recetasService.list(productoId);
      setRecetas(Array.isArray(rows) ? rows : rows?.items || []);
      setApiRecetas(true);
      setConteo((c) => ({ ...c, [productoId]: (Array.isArray(rows) ? rows.length : rows?.items?.length || 0) }));
    } catch (e) {
      // Backend aún no implementado → degradar a lectura sin romper la página.
      if (/HTTP 404/.test(e.message)) {
        setApiRecetas(false);
        setRecetas([]);
      } else {
        setAlert({ tone: 'error', message: e.message });
      }
    } finally {
      setLoadingReceta(false);
    }
  };

  useEffect(() => { recargarBase(); }, []);
  useEffect(() => { if (selectedId) cargarReceta(selectedId); }, [selectedId]);

  const seleccionado = useMemo(
    () => productos.find((p) => p.id_producto === selectedId) || null,
    [productos, selectedId],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const list = !q ? productos : productos.filter((p) => (p.nombre || '').toLowerCase().includes(q));
    return [...list].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  }, [productos, busqueda]);

  const sinReceta = useMemo(
    () => productos.filter((p) => conteo[p.id_producto] === 0).length,
    [productos, conteo],
  );

  const agregar = async (payload) => {
    setAlert(null);
    try {
      await recetasService.create(payload);
      setAlert({ tone: 'success', message: 'Insumo agregado a la receta' });
      await cargarReceta(payload.producto_id);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    }
  };

  const actualizar = async (id, payload) => {
    setAlert(null);
    try {
      await recetasService.update(id, payload);
      setAlert({ tone: 'success', message: 'Cantidad actualizada' });
      await cargarReceta(selectedId);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    }
  };

  const eliminar = async (id) => {
    setAlert(null);
    try {
      await recetasService.remove(id);
      setAlert({ tone: 'success', message: 'Insumo quitado de la receta' });
      await cargarReceta(selectedId);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    }
  };

  return (
    <div>
      <h1>Recetas</h1>
      <p className="text-muted">
        La receta se gestiona por producto: cada venta descuenta insumos y cada devolución los reintegra proporcionalmente.{' '}
        {sinReceta > 0 && <Badge tone="warning">{sinReceta} sin receta</Badge>}
      </p>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="recetas-grid">
        <Card
          title="Productos"
          actions={(
            <Input placeholder="Buscar producto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar producto" style={{ width: 180 }} />
          )}
        >
          {loading ? (
            <div className="d-flex flex-column gap-2"><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></div>
          ) : filtrados.length === 0 ? (
            <EmptyState title={busqueda ? 'Sin resultados' : 'Sin productos'} description="Crea productos primero en Catálogo → Productos." />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtrados.map((p) => {
                const n = conteo[p.id_producto];
                const img = resolveProductoImagen(p);
                const sel = p.id_producto === selectedId;
                return (
                  <li key={p.id_producto} style={{ marginBottom: 4 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id_producto)}
                      className={sel ? 'receta-sel' : ''}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bs-border-color, #E7E5E4)',
                        background: sel ? 'var(--bs-tertiary-bg, #F5F0EB)' : 'transparent', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {img
                        ? <img src={img} alt="" style={{ width: 32, height: 24, objectFit: 'cover', borderRadius: 4 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        : <span aria-hidden="true"><i className="bi bi-cup-hot" /></span>}
                      <span style={{ flex: 1 }}>{p.nombre}</span>
                      {n === undefined ? null : n === 0 ? <Badge tone="warning">Sin receta</Badge> : <Badge tone="neutral">{n}</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={seleccionado ? `Receta` : 'Detalle'}>
          {loadingReceta ? (
            <div className="d-flex flex-column gap-2"><Skeleton height={32} /><Skeleton height={32} /><Skeleton height={32} /></div>
          ) : (
            <RecetaPanel
              producto={seleccionado}
              recetas={recetas}
              insumos={insumos}
              apiDisponible={apiRecetas}
              onAdd={agregar}
              onUpdate={actualizar}
              onRemove={eliminar}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
