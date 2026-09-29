import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';

export default function Header({ title, breadcrumb }) {
  const { session } = useAuth();
  const userName = session?.user?.user_metadata?.name || session?.user?.email || 'Usuario';

  return (
    <header className="header">
      <div>
        <h1 className="header-title">{title}</h1>
        {breadcrumb && <div className="header-breadcrumb">{breadcrumb}</div>}
      </div>
      <div className="header-actions">
        <button className="btn btn-sm btn-outline-secondary position-relative">
          <i className="bi bi-bell"></i>
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            2
          </span>
        </button>
        <Avatar name={userName} size="md" />
      </div>
    </header>
  );
}
