import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from '../MainLayout.jsx';
import Sidebar from '../Sidebar.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));
vi.mock('../../context/PermisosContext.jsx', () => ({ usePermisos: () => ({ permisos: ['*'], loading: false, tienePermiso: () => true, recargar: vi.fn() }), PermisosProvider: ({ children }) => children }));

function renderMain() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <MainLayout />
    </MemoryRouter>
  );
}

describe('Drawer del menú en móvil', () => {
  it('muestra el botón de menú en el header', () => {
    renderMain();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument();
  });

  it('abre el sidebar al pulsar el botón de menú', () => {
    renderMain();
    expect(document.querySelector('.sidebar.open')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(document.querySelector('.sidebar.open')).toBeInTheDocument();
    expect(document.querySelector('.sidebar-backdrop')).toBeInTheDocument();
  });

  it('cierra el sidebar al pulsar el backdrop', () => {
    renderMain();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(document.querySelector('.sidebar.open')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.sidebar-backdrop'));
    expect(document.querySelector('.sidebar.open')).not.toBeInTheDocument();
    expect(document.querySelector('.sidebar-backdrop')).not.toBeInTheDocument();
  });

  it('cierra el sidebar al elegir un enlace', () => {
    renderMain();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(document.querySelector('.sidebar.open')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Ventas' }));
    expect(document.querySelector('.sidebar.open')).not.toBeInTheDocument();
  });

  it('cierra el sidebar con la tecla Escape', () => {
    renderMain();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(document.querySelector('.sidebar.open')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('.sidebar.open')).not.toBeInTheDocument();
  });

  it('Sidebar conserva enlaces sin props (compatibilidad)', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Ventas' })).toBeInTheDocument();
  });
});
