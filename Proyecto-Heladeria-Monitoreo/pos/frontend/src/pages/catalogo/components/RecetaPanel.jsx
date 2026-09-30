import { useMemo, useState } from 'react';
import Button from '../../../components/common/Button.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Input from '../../../components/common/Input.jsx';
import Select from '../../../components/common/Select.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import RequirePermiso from '../../../components/common/RequirePermiso.jsx';
import { getAlertaInsumo } from '../../../utils/inventario.js';
import { validarCantidad } from '../../../utils/receta.js';
import RecetaCostoBar from './RecetaCostoBar.jsx';

export default function RecetaPanel({
  producto,
  recetas = [],
  insumos = [],
  apiDisponible = true,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [formError, setFormError] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [editCantidad, setEditCantidad] = useState('');

  const porId = useMemo(() => {
    const m = new Map();
    insumos.forEach((i) => m.set(i.id_insumo, i));
    return m;
  }, [insumos]);

  // Enriquecer líneas con stock/unidad/nombre para costo + porciones + alertas.
  const lineas = useMemo(
    () =>
      recetas.map((r) => {
        const ins = porId.get(r.insumo_id) || {};
        return {
          ...r,
          insumo_nombre: r.insumo_nombre || ins.nombre || '—',
          unidad_medida: r.unidad_medida || ins.unidad_medida || '',
          stock: r.stock ?? ins.stock ?? 0,
          estado: r.estado || ins.estado || 'disponible',
          fecha_vencimiento: r.fecha_vencimiento || ins.fecha_vencimiento,
          stock_minimo: r.stock_minimo ?? ins.stock_minimo ?? 0,
        };
      }),
    [recetas, porId],
  );

  const disponibles = useMemo(
    () => insumos.filter((i) => (i.estado || 'disponible') === 'disponible'),
    [insumos],
  );

  if (!producto) {
    return <EmptyState title="Elige un producto" description="Selecciona un producto de la lista para ver su receta." />;
  }

  const agregar = async (ev) => {
    ev?.preventDefault();
    setFormError('');
    const err = validarCantidad(cantidad);
    if (!insumoId) {
      setFormError('Elige un insumo');
      return;
    }
    if (err) {
      setFormError(err);
      return;
    }
    if (lineas.some((l) => l.insumo_id === insumoId)) {
      setFormError('Ese insumo ya está en la receta');
      return;
    }
    await onAdd?.({ producto_id: producto.id_producto, insumo_id: insumoId, cantidad_requerida: Number(cantidad) });
    setInsumoId('');
    setCantidad('');
  };

  const empezarEdicion = (r) => {
    setEditandoId(r.id_receta);
    setEditCantidad(String(r.cantidad_requerida ?? ''));
    setFormError('');
  };

  const guardarEdicion = async (r) => {
    const err = validarCantidad(editCantidad);
    if (err) {
      setFormError(err);
      return;
    }
    await onUpdate?.(r.id_receta, { cantidad_requerida: Number(editCantidad) });
    setEditandoId(null);
    setEditCantidad('');
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Receta de {producto.nombre}</h2>
      <RecetaCostoBar lineas={lineas} />
      {!apiDisponible && (
        <p className="text-muted" role="note">
          API de recetas no disponible aún (404 /api/v1/recipes). Solo lectura de productos.
        </p>
      )}

      <RequirePermiso permiso="producto.gestionar">
        <form onSubmit={agregar}>
          <div className="row-inline">
            <Select label="Insumo" value={insumoId} onChange={(e) => setInsumoId(e.target.value)} style={{ minWidth: 220 }}>
              <option value="">Insumo…</option>
              {disponibles.map((i) => (
                <option key={i.id_insumo} value={i.id_insumo}>
                  {i.nombre} ({i.stock} {i.unidad_medida || ''})
                </option>
              ))}
            </Select>
            <Input
              label="Cantidad por porción"
              placeholder="Ej. 100"
              type="number"
              step="0.0001"
              min="0.0001"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              style={{ width: 170 }}
            />
            <div className="field" style={{ alignSelf: 'end' }}>
              <Button type="submit">Agregar</Button>
            </div>
          </div>
          {formError && <p role="alert" className="text-muted">{formError}</p>}
        </form>
      </RequirePermiso>

      {lineas.length === 0 ? (
        <EmptyState
          title="Sin receta"
          description="Este producto aún no descuenta insumos. Agrega el primero con el formulario de arriba."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Insumo</th><th>Cantidad</th><th>Stock</th><th>Alerta</th><th></th></tr>
          </thead>
          <tbody>
            {lineas.map((l) => {
              const alerta = getAlertaInsumo(l);
              const editando = editandoId === l.id_receta;
              return (
                <tr key={l.id_receta}>
                  <td>{l.insumo_nombre}</td>
                  <td>
                    {editando ? (
                      <Input
                        aria-label="Editar cantidad"
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={editCantidad}
                        onChange={(e) => setEditCantidad(e.target.value)}
                        style={{ width: 130 }}
                      />
                    ) : (
                      <span>{l.cantidad_requerida} {l.unidad_medida || ''}</span>
                    )}
                  </td>
                  <td>{l.stock} {l.unidad_medida || ''}</td>
                  <td>{alerta ? <Badge tone={alerta === 'vencido' ? 'error' : 'warning'}>{alerta}</Badge> : <span className="text-muted">—</span>}</td>
                  <td>
                    <RequirePermiso permiso="producto.gestionar">
                      {editando ? (
                        <>
                          <Button size="sm" onClick={() => guardarEdicion(l)}>Guardar</Button>{' '}
                          <Button size="sm" variant="secondary" onClick={() => setEditandoId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => empezarEdicion(l)}>Editar</Button>{' '}
                          <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Quitar ${l.insumo_nombre} de la receta?`)) onRemove?.(l.id_receta); }}>
                            Quitar
                          </Button>
                        </>
                      )}
                    </RequirePermiso>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
