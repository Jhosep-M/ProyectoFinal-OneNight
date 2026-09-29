import { useEffect, useState } from 'react';
import { actualizarPedido, cobrarPedido, crearPedido, listarPedidos } from '../../services/pedidosService.js';

const ESTADOS = ['abierto', 'en_preparacion', 'listo', 'cerrado', 'cancelado'];

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [mesaId, setMesaId] = useState('');
  const [items, setItems] = useState([{ producto_id: '', cantidad: 1 }]);
  const [msg, setMsg] = useState('');

  const recargar = async () => {
    try { setPedidos(await listarPedidos()); }
    catch (e) { setMsg(`Error: ${e.message}`); }
  };
  useEffect(() => { recargar(); }, []);

  const crear = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await crearPedido({
        mesa_id: mesaId || null,
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) })),
      });
      setMsg('Pedido creado');
      setMesaId('');
      setItems([{ producto_id: '', cantidad: 1 }]);
      recargar();
    } catch (e2) { setMsg(`Error: ${e2.message}`); }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarPedido(id, { estado });
      recargar();
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };

  const cobrar = async (id) => {
    const turno_id = window.prompt('turno_id (UUID abierto) del cajero:');
    if (!turno_id) return;
    const metodo_pago_id = window.prompt('metodo_pago_id (UUID):');
    if (!metodo_pago_id) return;
    const monto = window.prompt('monto total a cobrar:');
    if (monto === null) return;
    try {
      const r = await cobrarPedido(id, {
        turno_id,
        pagos: [{ metodo_pago_id, monto: Number(monto) }],
      });
      setMsg(`Pedido cobrado. Venta: ${r.venta_id}`);
      recargar();
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };

  return (
    <div>
      <h2>Pedidos</h2>
      {msg && <p className={msg.startsWith('Error') ? 'error' : 'ok'}>{msg}</p>}
      <div className="card">
        <h3>Nuevo pedido</h3>
        <form onSubmit={crear}>
          <div className="row">
            <input placeholder="mesa_id (opcional)" value={mesaId} onChange={(e) => setMesaId(e.target.value)} size={36} />
          </div>
          {items.map((it, k) => (
            <div className="row" key={k}>
              <input placeholder="producto_id" value={it.producto_id} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, producto_id: e.target.value } : x)))} required size={36} />
              <input type="number" min={1} step={1} value={it.cantidad} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, cantidad: e.target.value } : x)))} required style={{ width: 80 }} />
              <button type="button" onClick={() => setItems(items.filter((_, j) => j !== k))}>−</button>
            </div>
          ))}
          <div className="row">
            <button type="button" onClick={() => setItems([...items, { producto_id: '', cantidad: 1 }])}>+ item</button>
            <button type="submit">Crear pedido</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h3>Pedidos</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Mesa</th><th>Mesero</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id_pedido}>
                <td>{new Date(p.fecha).toLocaleString()}</td>
                <td>{p.mesa_nombre || p.mesa_id || '—'}</td>
                <td>{p.mesero_nombre || '—'}</td>
                <td>{p.estado}</td>
                <td>
                  <select value={p.estado} onChange={(e) => cambiarEstado(p.id_pedido, e.target.value)}>
                    {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {['abierto', 'en_preparacion', 'listo'].includes(p.estado) && (
                    <button onClick={() => cobrar(p.id_pedido)}>Cobrar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
