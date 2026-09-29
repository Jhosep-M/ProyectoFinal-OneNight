import { useEffect, useState } from 'react';
import { abrirTurno, cerrarTurno, listarTurnos } from '../../services/cajaService.js';

export default function CajaPage() {
  const [turnos, setTurnos] = useState([]);
  const [montoInicial, setMontoInicial] = useState('');
  const [cierres, setCierres] = useState({});
  const [msg, setMsg] = useState('');

  const recargar = async () => {
    try { setTurnos(await listarTurnos()); }
    catch (e) { setMsg(`Error: ${e.message}`); }
  };
  useEffect(() => { recargar(); }, []);

  const abrir = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await abrirTurno(Number(montoInicial));
      setMsg('Turno abierto');
      setMontoInicial('');
      recargar();
    } catch (e2) { setMsg(`Error: ${e2.message}`); }
  };

  const cerrar = async (id) => {
    const monto = window.prompt('Efectivo real en caja:');
    if (monto === null) return;
    try {
      const r = await cerrarTurno(id, Number(monto));
      setCierres((c) => ({ ...c, [id]: r }));
      setMsg(`Turno cerrado. Diferencia: ${r.diferencia}`);
      recargar();
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };

  return (
    <div>
      <h2>Caja / Turnos</h2>
      {msg && <p className={msg.startsWith('Error') ? 'error' : 'ok'}>{msg}</p>}
      <div className="card">
        <h3>Abrir turno</h3>
        <form onSubmit={abrir}>
          <div className="row">
            <input type="number" min={0} step={0.01} placeholder="monto inicial" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} required />
            <button type="submit">Abrir</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h3>Turnos</h3>
        <table>
          <thead><tr><th>Apertura</th><th>Inicial</th><th>Estado</th><th>Diferencia</th><th></th></tr></thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id_turno}>
                <td>{new Date(t.fecha_apertura).toLocaleString()}</td>
                <td>{t.monto_inicial}</td>
                <td>{t.estado}</td>
                <td>{t.diferencia ?? '—'}</td>
                <td>
                  {t.estado === 'abierto' && <button onClick={() => cerrar(t.id_turno)}>Cerrar</button>}
                  {cierres[t.id_turno] && <small> alerta: {cierres[t.id_turno].alertaGenerada ? 'sí' : 'no'}</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
