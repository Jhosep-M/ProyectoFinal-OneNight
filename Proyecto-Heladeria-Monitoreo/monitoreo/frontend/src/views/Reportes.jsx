import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { consumo } from '../services/reportesService';

export default function Reportes() {
  const { orgSeleccionada } = useAuth();
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      setError(null);
      setReporte(await consumo({
        organizacionId: orgSeleccionada,
        desde: rango.desde || undefined,
        hasta: rango.hasta || undefined,
      }));
    } catch (e) { setError(e.message); }
  }, [orgSeleccionada, rango]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <section>
      <h2>Reportes</h2>
      <p>
        Desde <input type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
        {' '}hasta <input type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
      </p>
      {error && <p className="error">{error}</p>}
      {reporte && (
        <div className="tarjetas">
          <div className="tarjeta">
            <h3>Consumo por recurso</h3>
            <table className="tabla">
              <thead><tr><th>Tipo</th><th>Total</th><th>Registros</th></tr></thead>
              <tbody>
                {reporte.porRecurso.map((r) => (
                  <tr key={r.tipo}><td>{r.tipo}</td><td>{Number(r.total).toLocaleString('es')}</td><td>{r.registros}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tarjeta">
            <h3>Alertas por nivel</h3>
            <table className="tabla">
              <thead><tr><th>Nivel</th><th>Total</th></tr></thead>
              <tbody>
                {reporte.alertasPorNivel.map((a) => (
                  <tr key={a.nivel}><td><span className={`badge ${a.nivel}`}>{a.nivel}</span></td><td>{a.total}</td></tr>
                ))}
                {reporte.alertasPorNivel.length === 0 && <tr><td colSpan="2">Sin alertas en el rango</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="tarjeta">
            <h3>Costo estimado (tarifa vigente)</h3>
            <table className="tabla">
              <thead><tr><th>Tipo</th><th>Costo</th></tr></thead>
              <tbody>
                {reporte.costoEstimado.map((c) => (
                  <tr key={c.tipo}><td>{c.tipo}</td><td>{Number(c.costo).toFixed(2)}</td></tr>
                ))}
                {reporte.costoEstimado.length === 0 && <tr><td colSpan="2">Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="tarjeta">
            <h3>Avance de metas</h3>
            <table className="tabla">
              <thead><tr><th>Meta</th><th>%</th><th>Consumo en período</th></tr></thead>
              <tbody>
                {reporte.avanceMetas.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nombre}</td>
                    <td>{Number(m.porcentaje_reduccion)}%</td>
                    <td>{Number(m.consumo_en_meta).toLocaleString('es')}</td>
                  </tr>
                ))}
                {reporte.avanceMetas.length === 0 && <tr><td colSpan="3">Sin metas activas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
