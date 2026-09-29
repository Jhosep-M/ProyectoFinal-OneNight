import { useEffect, useState } from 'react';
import { anularVenta, crearDevolucion, crearVenta, listarMetodosPago, listarVentas } from '../../services/ventasService.js';

const emptyItem = () => ({ producto_id: '', cantidad: 1 });
const emptyPago = () => ({ metodo_pago_id: '', monto: '' });

export default function VentasPage() {
  const [ventas, setVentas] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [turnoId, setTurnoId] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [pagos, setPagos] = useState([emptyPago()]);
  const [msg, setMsg] = useState('');
  const [dev, setDev] = useState({ venta_id: '', producto_id: '', cantidad: 1, motivo: '' });

  const recargar = async () => {
    try {
      setVentas(await listarVentas());
      setMetodos(await listarMetodosPago());
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };
  useEffect(() => { recargar(); }, []);

  const vender = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const r = await crearVenta({
        turno_id: turnoId,
        items: items.map((i) => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) })),
        pagos: pagos.map((p) => ({ metodo_pago_id: p.metodo_pago_id, monto: Number(p.monto) })),
      });
      setMsg(`Venta creada: ${r.venta_id}`);
      setItems([emptyItem()]);
      setPagos([emptyPago()]);
      recargar();
    } catch (e2) { setMsg(`Error: ${e2.message}`); }
  };

  const anular = async (id) => {
    const motivo = window.prompt('Motivo de anulación (≥5 caracteres):');
    if (!motivo) return;
    try {
      await anularVenta(id, motivo);
      setMsg('Venta anulada');
      recargar();
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };

  const devolver = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const r = await crearDevolucion({ ...dev, cantidad: Number(dev.cantidad) });
      setMsg(`Devolución procesada: ${JSON.stringify(r)}`);
      setDev({ venta_id: '', producto_id: '', cantidad: 1, motivo: '' });
    } catch (e2) { setMsg(`Error: ${e2.message}`); }
  };

  return (
    <div>
      <h2>Ventas</h2>
      {msg && <p className={msg.startsWith('Error') ? 'error' : 'ok'}>{msg}</p>}

      <div className="card">
        <h3>Nueva venta</h3>
        <form onSubmit={vender}>
          <div className="row">
            <input placeholder="turno_id (UUID abierto)" value={turnoId} onChange={(e) => setTurnoId(e.target.value)} required size={38} />
          </div>
          {items.map((it, k) => (
            <div className="row" key={k}>
              <input placeholder="producto_id" value={it.producto_id} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, producto_id: e.target.value } : x)))} required size={36} />
              <input type="number" min={1} step={1} value={it.cantidad} onChange={(e) => setItems(items.map((x, j) => (j === k ? { ...x, cantidad: e.target.value } : x)))} required style={{ width: 80 }} />
              <button type="button" onClick={() => setItems(items.filter((_, j) => j !== k))}>−</button>
            </div>
          ))}
          <div className="row"><button type="button" onClick={() => setItems([...items, emptyItem()])}>+ producto</button></div>
          {pagos.map((p, k) => (
            <div className="row" key={k}>
              <select value={p.metodo_pago_id} onChange={(e) => setPagos(pagos.map((x, j) => (j === k ? { ...x, metodo_pago_id: e.target.value } : x)))} required>
                <option value="">método…</option>
                {metodos.map((m) => <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>)}
              </select>
              <input type="number" min={0.01} step={0.01} placeholder="monto" value={p.monto} onChange={(e) => setPagos(pagos.map((x, j) => (j === k ? { ...x, monto: e.target.value } : x)))} required style={{ width: 110 }} />
              <button type="button" onClick={() => setPagos(pagos.filter((_, j) => j !== k))}>−</button>
            </div>
          ))}
          <div className="row"><button type="button" onClick={() => setPagos([...pagos, emptyPago()])}>+ pago (dividido)</button></div>
          <button type="submit">Cobrar</button>
        </form>
      </div>

      <div className="card">
        <h3>Últimas ventas</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id_venta}>
                <td>{new Date(v.fecha).toLocaleString()}</td>
                <td>{v.total}</td>
                <td>{v.estado}</td>
                <td>{v.estado === 'activa' && <button onClick={() => anular(v.id_venta)}>Anular</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Devolución</h3>
        <form onSubmit={devolver}>
          <div className="row">
            <input placeholder="venta_id" value={dev.venta_id} onChange={(e) => setDev({ ...dev, venta_id: e.target.value })} required size={36} />
            <input placeholder="producto_id" value={dev.producto_id} onChange={(e) => setDev({ ...dev, producto_id: e.target.value })} required size={36} />
            <input type="number" min={1} step={1} value={dev.cantidad} onChange={(e) => setDev({ ...dev, cantidad: e.target.value })} required style={{ width: 80 }} />
            <input placeholder="motivo (≥5)" value={dev.motivo} onChange={(e) => setDev({ ...dev, motivo: e.target.value })} required />
            <button type="submit">Procesar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
