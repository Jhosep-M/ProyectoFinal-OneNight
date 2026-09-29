import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AuthLayout from '../AuthLayout.jsx';
import MainLayout from '../MainLayout.jsx';
import Sidebar from '../Sidebar.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

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
    expect(screen.getByText('POS Heladería')).toBeInTheDocument();
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
  it('renderiza Sidebar y contenido', () => {
    render(
      <MemoryRouter>
        <MainLayout><p>Contenido</p></MainLayout>
      </MemoryRouter>
    );
    expect(screen.getByText('POS Heladería')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });
});
