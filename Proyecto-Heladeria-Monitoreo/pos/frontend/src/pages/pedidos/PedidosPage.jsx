import { useEffect, useState } from 'react';
import { listarPedidos, crearPedido, actualizarPedido, cobrarPedido } from '../../services/pedidosService.js';
import { listarMesas } from '../../services/mesasService.js';
import { productosService } from '../../services/productosService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/alerts/Alert.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import RequirePermiso from '../../components/common/RequirePermiso.jsx';

const TONE_ESTADO = {
  pendiente: 'warning',
  en_preparacion: 'info',
  listo: 'success',
  cobrado: 'neutral',
  cancelado: 'error',
};

const emptyItem = () => ({ producto_id: '', cantidad: 1 });

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesaId, setMesaId] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [alert, setAlert] = useState(null);

  const recargar = async () => {
    setLoading(true);
    try {
      const [p, m, pr] = await Promise.all([listarPedidos(), listarMesas(), productosService.list()]);
      setPedidos(p);
      setMesas(m);
      setProductos(pr);
    } catch (e) {
      setAlert({ tone: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { recargar(); }, []);

  const crear = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      await crearPedido({
        mesa_id: mesaId,
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) })),
      });
      setAlert({ tone: 'success', message: 'Pedido creado' });
      setItems([emptyItem()]);
      recargar();
    } catch (e2) { setAlert({ tone: 'error', message: e2.message }); }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarPedido(id, { estado });
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  const cobrar = async (id) => {
    const turnoId = window.prompt('Turno ID para cobrar:');
    if (!turnoId) return;
    try {
      await cobrarPedido(id, { turno_id: turnoId, pagos: [] });
      setAlert({ tone: 'success', message: 'Pedido cobrado' });
      recargar();
    } catch (e) { setAlert({ tone: 'error', message: e.message }); }
  };

  return (
    <div>
      <h1>Pedidos</h1>
      {alert && <Alert tone={alert.tone} message={alert.message} onClose={() => setAlert(null)} />}

      <Card title="Nuevo pedido">
        <form onSubmit={crear}>
          <div className="row">
            <Select value={mesaId} onChange={(e) => setMesaId(e.target.value)} required>
              <option value="">mesa…</option>
              {mesas.map((m) => <option key={m.id_mesa} value={m.id_mesa}>Mesa {m.numero}</option>)}
            </Select>
          </div>
          {items.map((it, k) => (
            <div className="row" key={k}>
              <Select
                value={it.producto_id}
                onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, producto_id: e.target.value } : x)))}
                required
              >
                <option value="">producto…</option>
                {productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}
              </Select>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="cant."
                value={it.cantidad}
                onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, cantidad: e.target.value } : x)))}
                required
                style={{ width: 70 }}
              />
              <Button type="button" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== k))}>−</Button>
            </div>
          ))}
          <div className="row">
            <Button type="button" variant="secondary" onClick={() => setItems([...items, emptyItem()])}>+ producto</Button>
            <Button type="submit">Crear pedido</Button>
          </div>
        </form>
      </Card>

      <Card title="Pedidos">
        {loading ? (
          <p>Cargando…</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Mesa</th><th>Estado</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id_pedido}>
                  <td>{p.mesa_id}</td>
                  <td><Badge tone={TONE_ESTADO[p.estado] || 'neutral'}>{p.estado}</Badge></td>
                  <td>{p.total}</td>
                    <td>
                      <RequirePermiso permiso="pedido.gestionar">
                        {p.estado === 'pendiente' && <Button size="sm" variant="secondary" onClick={() => cambiarEstado(p.id_pedido, 'en_preparacion')}>Preparar</Button>}
                        {p.estado === 'en_preparacion' && <Button size="sm" variant="secondary" onClick={() => cambiarEstado(p.id_pedido, 'listo')}>Listo</Button>}
                      </RequirePermiso>
                      <RequirePermiso permiso="venta.crear">
                        {p.estado === 'listo' && <Button size="sm" onClick={() => cobrar(p.id_pedido)}>Cobrar</Button>}
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
