import { useEffect, useState } from 'react';
import { crearMesa, listarMesas, verMesa } from '../../services/mesasService.js';

export default function MesasPage() {
  const [mesas, setMesas] = useState([]);
  const [numero, setNumero] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [msg, setMsg] = useState('');

  const recargar = async () => {
    try { setMesas(await listarMesas()); }
    catch (e) { setMsg(`Error: ${e.message}`); }
  };
  useEffect(() => { recargar(); }, []);

  const crear = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await crearMesa(Number(numero));
      setMsg('Mesa creada');
      setNumero('');
      recargar();
    } catch (e2) { setMsg(`Error: ${e2.message}`); }
  };

  const ver = async (id) => {
    try { setDetalle(await verMesa(id)); }
    catch (e) { setMsg(`Error: ${e.message}`); }
  };

  return (
    <div>
      <h2>Mesas</h2>
      {msg && <p className={msg.startsWith('Error') ? 'error' : 'ok'}>{msg}</p>}
      <div className="card">
        <h3>Nueva mesa</h3>
        <form onSubmit={crear}>
          <div className="row">
            <input type="number" min={1} step={1} placeholder="número" value={numero} onChange={(e) => setNumero(e.target.value)} required />
            <button type="submit">Crear</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h3>Mesas</h3>
        <table>
          <thead><tr><th>Número</th><th>Estado</th><th>Pedidos abiertos</th><th></th></tr></thead>
          <tbody>
            {mesas.map((m) => (
              <tr key={m.id_mesa}>
                <td>{m.numero}</td>
                <td>{m.estado}</td>
                <td>{m.pedidos_abiertos ?? '—'}</td>
                <td><button onClick={() => ver(m.id_mesa)}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detalle && (
        <div className="card">
          <h3>Mesa {detalle.numero} — pedidos abiertos</h3>
          <ul>
            {(detalle.pedidos || []).map((p) => (
              <li key={p.id_pedido}>{p.estado} — {new Date(p.fecha).toLocaleString()}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
