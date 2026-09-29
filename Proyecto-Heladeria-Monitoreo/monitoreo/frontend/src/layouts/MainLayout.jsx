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
];

export default function MainLayout() {
  const { sesion, cerrarSesion, perfil, orgSeleccionada, setOrgSeleccionada } = useAuth();

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
    </div>
  );
}
