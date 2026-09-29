<<<<<<< HEAD
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Task 12 agrega aquí los enlaces restantes (organizaciones, medidores,
// umbrales, metas, tarifas, recomendaciones, notificaciones, reportes).
const enlaces = [
  { a: '/consumo', texto: 'Consumo' },
  { a: '/alertas', texto: 'Alertas' },
  { a: '/notificaciones', texto: 'Notificaciones' },
  { a: '/organizaciones', texto: 'Organizaciones' },
  { a: '/medidores', texto: 'Medidores' },
  { a: '/umbrales', texto: 'Umbrales' },
  { a: '/metas', texto: 'Metas' },
  { a: '/tarifas', texto: 'Tarifas' },
  { a: '/recomendaciones', texto: 'Recomendaciones' },
  { a: '/reportes', texto: 'Reportes' },
=======
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
  { a: '/notificaciones', texto: 'Notificaciones', icono: 'mail' },
  { a: '/auditoria', texto: 'Auditoría', icono: 'history' },
>>>>>>> origin/feature/Airton-auxilio
];

export default function MainLayout() {
  const { sesion, cerrarSesion, perfil, orgSeleccionada, setOrgSeleccionada } = useAuth();
<<<<<<< HEAD

  return (
    <div className="layout">
      <header className="cabecera">
        <strong>Monitoreo Agua y Energía</strong>
        <nav>
          {enlaces.map((e) => (
            <NavLink key={e.a} to={e.a} className={({ isActive }) => (isActive ? 'activo' : '')}>
              {e.texto}
            </NavLink>
          ))}
        </nav>
        <div className="sesion">
          {perfil?.organizaciones?.length > 1 && (
            <select value={orgSeleccionada ?? ''} onChange={(e) => setOrgSeleccionada(e.target.value)}>
              {perfil.organizaciones.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          )}
          <span>{sesion?.user?.email}</span>
          <button type="button" onClick={cerrarSesion}>Salir</button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
=======
  const [abiertas, setAbiertas] = useState(null);
  const [hora, setHora] = useState(() => new Date());
  const navigate = useNavigate();
  const nombre = perfil?.nombre ?? perfil?.usuario?.nombre ?? sesion?.user?.email?.split('@')[0] ?? '';

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
          <button type="button" onClick={cerrarSesion}>Salir</button>
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
>>>>>>> origin/feature/Airton-auxilio
    </div>
  );
}
