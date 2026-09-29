import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resumen } from '../services/dashboardService';
import { listar as listarMedidores } from '../services/medidoresService';
import { acusar } from '../services/alertasService';

function fmt(n, dec = 2) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function esHoy(fecha) {
  if (!fecha) return false;
  const d = new Date(fecha);
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

function tiempoRel(fecha) {
  if (!fecha) return '-';
  const min = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `Hace ${h} h` : `Hace ${Math.floor(h / 24)} d`;
}

export default function Dashboard() {
  const { orgSeleccionada } = useAuth();
  const [datos, setDatos] = useState(null);
  const [medidores, setMedidores] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!orgSeleccionada) return;
    setCargando(true);
    setError(null);
    try {
      const [res, med] = await Promise.all([
        resumen({ organizacionId: orgSeleccionada }),
        listarMedidores({ organizacionId: orgSeleccionada }).catch(() => ({ data: [] })),
      ]);
      setDatos(res);
      setMedidores(med.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [orgSeleccionada]);

  useEffect(() => { cargar(); }, [cargar]);

  async function reconocer(id) {
    try {
      setError(null);
      await acusar(id);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!orgSeleccionada) return <p>Selecciona una organización.</p>;

  const consumos = datos?.consumo ?? [];
  const aguaHoy = consumos.filter((r) => r.tipo_recurso === 'agua' && esHoy(r.fecha_consumo)).reduce((s, r) => s + Number(r.cantidad || 0), 0);
  const energiaHoy = consumos.filter((r) => r.tipo_recurso === 'energia' && esHoy(r.fecha_consumo)).reduce((s, r) => s + Number(r.cantidad || 0), 0);
  const alertas = datos?.alertas ?? [];
  const abiertas = alertas.filter((a) => (a.estado ?? '').toLowerCase() !== 'resuelta');

  return (
    <section>
      <div className="panel-cabeza" style={{ border: 'none', paddingLeft: 0 }}>
        <h2 style={{ border: 'none', margin: 0, padding: 0 }}>Monitoreo diario de consumos</h2>
        <p>Lecturas continuas de contadores de planta - Heladería Central La Paz</p>
      </div>
      {error && <p className="error">{error}</p>}
      {cargando && <p className="cargando">Cargando...</p>}

      <div className="tarjetas">
        <div className="kpi">
          <div><div className="kpi-etiqueta"><span>Agua hoy</span><span className="material-symbols-outlined" style={{ color: '#1E40AF' }} aria-hidden="true">water_drop</span></div><div className="kpi-valor agua">{fmt(aguaHoy)} L</div></div>
          <div className="kpi-pie"><span>Contador principal</span><span>Norma EPSAS</span></div>
        </div>
        <div className="kpi">
          <div><div className="kpi-etiqueta"><span>Energía hoy</span><span className="material-symbols-outlined" style={{ color: '#92400E' }} aria-hidden="true">bolt</span></div><div className="kpi-valor energia">{fmt(energiaHoy)} kWh</div></div>
          <div className="kpi-pie"><span>Línea trifásica</span><span>DELAPAZ</span></div>
        </div>
        <div className="kpi">
          <div><div className="kpi-etiqueta"><span>Alertas abiertas</span><span className="badge energia">Atención</span></div><div className="kpi-valor energia">{abiertas.length}</div></div>
          <div className="kpi-pie"><span>Requiere revisión de turno</span><Link to="/alertas">Ver</Link></div>
        </div>
        <div className="kpi">
          <div><div className="kpi-etiqueta"><span>Registros</span><span className="material-symbols-outlined" aria-hidden="true">track_changes</span></div><div className="kpi-valor">{datos?.totalConsumo ?? '-'}</div></div>
          <div className="kpi-pie"><span>En el período</span><Link to="/consumo">Ver consumo</Link></div>
        </div>
      </div>

      <div className="grid-dashboard">
        <section className="panel col-8">
          <div className="panel-cabeza"><h3>Consumos recientes registrados</h3><p>Telemetría de contadores en planta</p></div>
          <div className="tabla-scroll">
            <table className="tabla tabla-fit" style={{ marginTop: 0, border: 'none' }}>
              <thead><tr><th>Fecha / Hora</th><th>Medidor</th><th>Tipo</th><th>Cantidad</th><th>Origen</th><th>Estado</th></tr></thead>
              <tbody>
                {consumos.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.fecha_consumo ? new Date(r.fecha_consumo).toLocaleString('es') : '-'}</code></td>
                    <td><code>{r.codigo_medidor ?? r.medidor ?? '-'}</code></td>
                    <td><span className={`badge ${r.tipo_recurso === 'agua' ? 'agua' : 'energia'}`}>{r.tipo_recurso === 'agua' ? 'AGUA' : 'ENERGÍA'}</span></td>
                    <td className="num"><strong>{fmt(r.cantidad)} {r.unidad_medida ?? ''}</strong></td>
                    <td>{r.origen ?? '-'}</td>
                    <td><span className="badge">{r.clasificacion ?? r.estado ?? 'Normal'}</span></td>
                  </tr>
                ))}
                {consumos.length === 0 && !cargando && !error && <tr><td colSpan="6">Sin registros para este filtro</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="panel-pie"><span>Mostrando {Math.min(5, consumos.length)} de {datos?.totalConsumo ?? 0} registros</span><Link to="/consumo">Ver todo</Link></div>
        </section>

        <section className="panel col-4">
          <div className="panel-cabeza"><h3>Alertas activas del sistema</h3><p>Sin confirmar</p></div>
          <div>
            {abiertas.slice(0, 3).map((a) => (
              <div className="alerta-bloque" key={a.id}>
                <div className="alerta-fila">
                  <span className={`badge ${a.tipo_recurso === 'agua' ? 'agua' : 'energia'}`}>{(a.tipo_recurso ?? '').toUpperCase() || 'ALERTA'}</span>
                  <span className="alerta-tiempo">{tiempoRel(a.fecha_generacion)}</span>
                </div>
                <p className="alerta-msg">{a.mensaje ?? '-'}</p>
                <div className="alerta-fila">
                  <span className="alerta-detalle">{a.medidor ?? ''}</span>
                  <button type="button" className="btn-secundario" onClick={() => reconocer(a.id)}>Reconocer</button>
                </div>
              </div>
            ))}
            {abiertas.length === 0 && !cargando && !error && <p style={{ padding: 14 }}>Sin alertas activas</p>}
          </div>
          <div className="panel-pie"><Link to="/alertas">Ver bitácora completa <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: -3 }} aria-hidden="true">arrow_forward</span></Link></div>
        </section>
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel-cabeza"><h3>Telemetría de medidores principales</h3><p>{medidores.length} unidades</p></div>
        <div className="tarjetas" style={{ padding: 16 }}>
          {medidores.slice(0, 4).map((m) => (
            <div className="medidor-mini" key={m.id}>
              <span className={`codigo ${(m.tipoRecurso?.nombre ?? '').toLowerCase().includes('agua') ? 'agua' : 'energia'}`}>{m.codigo_medidor}</span>
              <div className="valor" title={m.nombre}>{m.nombre}</div>
              <p>Estado: {m.estado ?? '-'}</p>
            </div>
          ))}
          {medidores.length === 0 && !cargando && !error && <p>Sin medidores</p>}
        </div>
      </div>
    </section>
  );
}
