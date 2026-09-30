import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listar as listarAlertas } from '../services/alertasService';

const enlaces = [
  { a: '/', texto: 'Dashboard', icono: 'dashboard' },
  { a: '/consumo', texto: 'Consumo', icono: 'water_drop' },
  { a: '/medidores', texto: 'Medidores', icono: 'speed' },
  { a: '/umbrales', texto: 'Umbrales', icono: 'tune' },
  { a: '/alertas', texto: 'Alertas', icono: 'notifications', insignia: true },
  { a: '/metas', texto: 'Metas', icono: 'flag' },
  { a: '/tarifas', texto: 'Tarifas', icono: 'payments' },
  { a: '/recomendaciones', texto: 'Recomendaciones', icono: 'tips_and_updates' },
  { a: '/reportes', texto: 'Reportes', icono: 'assessment' },
  { a: '/organizaciones', texto: 'Organizaciones', icono: 'domain' },
  { a: '/integraciones', texto: 'Integraciones', icono: 'link' },
  { a: '/notificaciones', texto: 'Notificaciones', icono: 'mail' },
  { a: '/auditoria', texto: 'Auditoría', icono: 'history' },
];

export default function MainLayout() {
  const { sesion, cerrarSesion, perfil, orgSeleccionada, setOrgSeleccionada } = useAuth();
  const [abiertas, setAbiertas] = useState(null);
  const [hora, setHora] = useState(() => new Date());
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalir, setErrorSalir] = useState(null);
  const navigate = useNavigate();
  const nombre = perfil?.nombre ?? perfil?.usuario?.nombre ?? sesion?.user?.email?.split('@')[0] ?? '';

  async function handleSalir() {
    if (saliendo) return;
    setErrorSalir(null);
    setSaliendo(true);
    try {
      await cerrarSesion();
      navigate('/login', { replace: true });
    } catch {
      setErrorSalir('No se pudo cerrar sesión. Intenta de nuevo.');
    } finally {
      setSaliendo(false);
    }
  }

  const cargarAbiertas = useCallback(async () => {
    if (!orgSeleccionada) return;
    try {
      const r = await listarAlertas({ organizacionId: orgSeleccionada });
      const data = r.data ?? [];
      setAbiertas(data.filter((a) => (a.estado ?? '').toLowerCase() !== 'resuelta').length);
    } catch {
      setAbiertas(null);
    }
  }, [orgSeleccionada]);

  useEffect(() => { cargarAbiertas(); }, [cargarAbiertas]);
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="marca">
          <span className="logo">HC</span>
          <span className="marca-texto">
            <strong>Heladería Central</strong>
            <span>Planta La Paz (es-BO)</span>
          </span>
        </div>
        {perfil?.organizaciones?.length > 0 && (
          <select
            className="org-select"
            value={orgSeleccionada ?? ''}
            onChange={(e) => setOrgSeleccionada(e.target.value)}
            aria-label="Organización"
          >
            {perfil.organizaciones.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        )}
        <div className="nav-etiqueta">Módulos de planta</div>
        <nav>
          {enlaces.map((e) => (
            <NavLink key={e.a} to={e.a} className={({ isActive }) => (isActive ? 'activo' : '')}>
              <span className="material-symbols-outlined nav-icono" aria-hidden="true">{e.icono}</span>
              <span className="nav-texto">{e.texto}</span>
              {e.insignia && abiertas != null && abiertas > 0 && (
                <span className="nav-badge">{abiertas}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="pie">
          <span>{nombre}</span>
          <button type="button" onClick={handleSalir} disabled={saliendo}>
            {saliendo ? 'Saliendo…' : 'Salir'}
          </button>
          {errorSalir && <p className="error" role="alert">{errorSalir}</p>}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="topbar-estado">
            <span className="punto" aria-hidden="true" />
            Sensores telemedidos en línea <span className="topbar-sep">|</span> Planta Miraflores (La Paz)
          </span>
          <span className="topbar-acciones">
            <span className="topbar-fecha" title={hora.toLocaleString('es')}><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: -3 }} aria-hidden="true">calendar_today</span> Hoy</span>
            <button type="button" className="btn-secundario" onClick={() => window.location.reload()} title="Recargar"><span className="material-symbols-outlined" aria-hidden="true">refresh</span></button>
            <button type="button" className="btn" onClick={() => navigate('/consumo')}><span className="material-symbols-outlined" aria-hidden="true">add</span> Registrar consumo</button>
          </span>
        </header>
        <main className="contenido">
          <Outlet />
        </main>
        <footer className="statusbar">
          <span>Última sincronización: <strong>{hora.toLocaleTimeString('es')}</strong></span>
          <span>Heladería Central S.R.L. · UI v5-fit</span>
        </footer>
      </div>
    </div>
  );
}
