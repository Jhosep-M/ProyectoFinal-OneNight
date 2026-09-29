import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AuthLayout from '../AuthLayout.jsx';
import MainLayout from '../MainLayout.jsx';
import Sidebar from '../Sidebar.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));
const permsState = vi.hoisted(() => ({ concedidos: true }));
vi.mock('../../context/PermisosContext.jsx', () => ({ usePermisos: () => ({ permisos: permsState.concedidos ? ['*'] : [], loading: false, tienePermiso: () => permsState.concedidos, recargar: vi.fn() }), PermisosProvider: ({ children }) => children }));

describe('AuthLayout', () => {
  it('envuelve children en contenedor centrado', () => {
    render(<AuthLayout><p>Login</p></AuthLayout>);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(document.querySelector('.auth-wrap')).toBeInTheDocument();
  });
});

describe('Sidebar', () => {
  it('renderiza marca', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('Helados Pariente')).toBeInTheDocument();
  });

  it('renderiza grupos de navegación', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('Operación')).toBeInTheDocument();
    expect(screen.getByText('Catálogo')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
  });

  it('renderiza enlaces principales', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Ventas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Caja' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedidos' })).toBeInTheDocument();
  });

  it('oculta enlaces sin permiso pero conserva Dashboard', () => {
    permsState.concedidos = false;
    try {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Ventas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Caja' })).not.toBeInTheDocument();
    } finally {
      permsState.concedidos = true;
    }
  });

  it('muestra email del usuario', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('c@h.com')).toBeInTheDocument();
  });

  it('renderiza botón salir', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
  });
});

describe('MainLayout', () => {
  it('renderiza Sidebar y encabezado', () => {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );
    expect(document.querySelector('.sidebar .brand-name')).toHaveTextContent('Helados Pariente');
    expect(document.querySelector('.header')).toBeInTheDocument();
  });
});
