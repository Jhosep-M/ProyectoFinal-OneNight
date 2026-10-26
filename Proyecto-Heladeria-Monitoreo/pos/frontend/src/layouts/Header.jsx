import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';

export default function Header({ title, breadcrumb, onMenu, menuAbierto = false }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const userName = session?.user?.user_metadata?.name || session?.user?.email || 'Usuario';

  return (
    <header className="header">
      {onMenu && (
        <button
          type="button"
          className="btn btn-ghost btn-sm menu-toggle"
          onClick={onMenu}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
        >
          <i className="bi bi-list" aria-hidden="true"></i>
        </button>
      )}
      <div className="header-titles">
        <h1 className="header-title">{title}</h1>
        {breadcrumb && <div className="header-breadcrumb">{breadcrumb}</div>}
      </div>
      <div className="header-actions">
        <button
          className="btn btn-ghost btn-sm position-relative"
          title="Ver auditoría"
          aria-label="Ver auditoría"
          onClick={() => navigate('/auditoria')}
        >
          <i className="bi bi-bell"></i>
          <span
            className="position-absolute rounded-circle"
            aria-hidden="true"
            style={{ width: '8px', height: '8px', background: '#8B6914', top: '8px', right: '10px', border: '1.5px solid #fff' }}
          />
        </button>
        <Avatar name={userName} size="md" />
      </div>
    </header>
  );
}
