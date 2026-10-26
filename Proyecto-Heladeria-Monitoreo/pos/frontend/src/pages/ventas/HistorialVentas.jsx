import { useCallback, useEffect, useState } from 'react';
import Card from '../../components/common/Card.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';
import { formatCurrency } from '../../utils/format.js';
import { listarVentas, listarMetodosPago, anularVenta } from '../../services/ventasService.js';
import { actualizarPedido } from '../../services/pedidosService.js';

// HU-14 — Historial de ventas con filtros (fecha/estado/cajero/método).
// El backend aplica ownership: cajero ve solo su turno, admin todo.
// Montos con token numérico + tabular-nums (AGENTS §15.1).
const montoStyle = {
  fontFamily: 'var(--bs-font-numeric)',
  fontVariantNumeric: 'tabular-nums',
};

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', estado: '', cajero: '', metodo: '' });
  const [aplicados, setAplicados] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [anulando, setAnulando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    listarMetodosPago().catch(() => []).then((m) => setMetodos(m || []));
  }, []);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError('');
    try {
      const data = await listarVentas(aplicados);
      setVentas(data || []);
    } catch (e) {
      setError(e.message || 'No se pudo cargar el historial');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [aplicados]);

  useEffect(() => {
    cargar(false);
  }, [cargar]);

  const aplicar = (e) => {
    e.preventDefault();
    setAplicados({ ...filtros });
  };

  const limpiar = () => {
    setFiltros({ desde: '', hasta: '', estado: '', cajero: '', metodo: '' });
    setAplicados({});
  };

  const abrirAnulacion = (venta) => {
    setAnulando(venta);
    setMotivo('');
    setMotivoError('');
    setExito('');
  };

  const cerrarAnulacion = () => {
    if (procesando) return;
    setAnulando(null);
    setMotivo('');
    setMotivoError('');
  };

  const confirmarAnulacion = async () => {
    const texto = motivo.trim();
    if (texto.length < 5) {
      setMotivoError('El motivo es obligatorio (mínimo 5 caracteres).');
      return;
    }
    if (!anulando || procesando) return;
    const id = anulando.id_venta || anulando.id;
    setProcesando(true);
    setMotivoError('');
    try {
      await anularVenta(id, texto);
      // Anular ambos: si la venta tiene pedido espejo (venta_directa),
      // cancelarlo para no dejar un "Cobrado en ventas" abierto en Pedidos/Cocina.
      let avisoEspejo = '';
      const pedidoId = anulando.pedido_id;
      if (pedidoId) {
        try {
          await actualizarPedido(pedidoId, { estado: 'cancelado' });
        } catch (eEspejo) {
          // El espejo puede estar ya cerrado/cancelado (409/404): no bloquea.
          const msg = String(eEspejo?.message || '');
          if (!/404|409|ya |cerrado|cancelado/i.test(msg)) {
            avisoEspejo = ' Venta anulada, pero el pedido de cocina no se pudo cancelar: ' + msg;
          }
        }
      }
      // Optimista: refleja el cambio al instante, la recarga silenciosa lo confirma.
      setVentas((prev) => prev.map((v) =>
        (v.id_venta || v.id) === id ? { ...v, estado: 'anulada', motivo_anulacion: texto } : v
      ));
      setExito(`Venta #${String(id).slice(0, 8)} anulada. Stock y puntos revertidos.${avisoEspejo}`);
      setAnulando(null);
      setMotivo('');
      await cargar(true);
    } catch (e) {
      setMotivoError(e.message || 'No se pudo anular la venta');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div>
      <h1>Historial de ventas</h1>
      <p className="text-muted">Filtra por fecha, estado, cajero y método de pago.</p>
      {error && <Alert tone="error" message={error} />}
      {exito && <Alert tone="success" message={exito} onClose={() => setExito('')} />}

      <Card title="Filtros">
        <form onSubmit={aplicar}>
          <div className="filters-grid">
            <Input type="date" aria-label="Fecha desde" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
            <Input type="date" aria-label="Fecha hasta" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
            <Select aria-label="Estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
              <option value="">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="anulada">Anulada</option>
            </Select>
            <Input placeholder="Cajero (usuario_id)" aria-label="Cajero" value={filtros.cajero} onChange={(e) => setFiltros({ ...filtros, cajero: e.target.value })} />
            <Select aria-label="Método de pago" value={filtros.metodo} onChange={(e) => setFiltros({ ...filtros, metodo: e.target.value })}>
              <option value="">Todos los métodos</option>
              {metodos.map((m) => (
                <option key={m.id_metodo_pago || m.id} value={m.id_metodo_pago || m.id}>{m.nombre}</option>
              ))}
            </Select>
            <div className="d-flex gap-2">
              <Button type="submit">Filtrar</Button>
              <Button type="button" variant="secondary" onClick={limpiar}>Limpiar</Button>
            </div>
          </div>
        </form>
      </Card>

      <Card title={`Ventas (${ventas.length})`}>
        {loading ? (
          <div className="d-flex flex-column gap-2"><Skeleton height={36} /><Skeleton height={36} /></div>
        ) : ventas.length === 0 ? (
          <EmptyState title="Sin ventas" description="No hay ventas para los filtros aplicados." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Venta</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Turno</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {ventas.map((v) => {
                  const id = v.id_venta || v.id;
                  const activa = (v.estado || 'activa') === 'activa';
                  return (
                    <tr key={id}>
                      <td><code>#{String(id).slice(0, 8)}</code></td>
                      <td>{v.fecha ? new Date(v.fecha).toLocaleString('es-BO') : '—'}</td>
                      <td style={montoStyle}>{v.total != null ? formatCurrency(v.total) : '—'}</td>
                      <td>
                        <Badge tone={activa ? 'success' : 'neutral'}>
                          {v.estado || 'activa'}
                        </Badge>
                      </td>
                      <td><code>{v.turno_id ? String(v.turno_id).slice(0, 8) : '—'}</code></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <RequirePermiso permiso="venta.anular" fallback={null}>
                          {activa && (
                            <Button size="sm" variant="ghost" onClick={() => abrirAnulacion(v)}>
                              Anular
                            </Button>
                          )}
                        </RequirePermiso>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {anulando && (
        <div className="modal d-block" tabIndex="-1" role="dialog" aria-label="Anular venta">
          <div className="modal-dialog" role="document">
            <div className="modal-content p-3">
              <h5 className="mb-1">Anular venta #{String(anulando.id_venta || anulando.id).slice(0, 8)}</h5>
              <p className="text-muted small mb-3" style={{ fontFamily: 'var(--bs-font-sans-serif)' }}>
                Total <strong style={montoStyle}>{formatCurrency(anulando.total ?? 0)}</strong>.
                Restaura stock de productos e insumos, revierte puntos y queda en auditoría.
                {anulando.pedido_id ? ' También cancelará el pedido espejo de cocina.' : ''}
                Esta acción no se puede deshacer.
              </p>
              <label htmlFor="motivo-anulacion" className="form-label small fw-semibold mb-1">
                Motivo (obligatorio)
              </label>
              <textarea
                id="motivo-anulacion"
                className="form-control mb-1"
                rows={3}
                placeholder="Ej. Cliente devolvió el producto, error de cobro…"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <small className="text-muted mb-2">Mínimo 5 caracteres.</small>
              {motivoError && <div className="alert alert-danger py-2 small" role="alert">{motivoError}</div>}
              <div className="d-flex gap-2 justify-content-end mt-2">
                <Button variant="secondary" onClick={cerrarAnulacion} disabled={procesando}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  loading={procesando}
                  disabled={procesando || motivo.trim().length < 5}
                  onClick={confirmarAnulacion}
                >
                  {procesando ? 'Anulando...' : 'Confirmar anulación'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
