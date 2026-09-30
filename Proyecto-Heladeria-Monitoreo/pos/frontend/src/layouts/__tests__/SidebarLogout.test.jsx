import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar.jsx';

const navigateSpy = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

const mockSignOut = vi.fn();

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    session: { user: { email: 'c@h.com' } },
    loading: false,
    signOut: mockSignOut,
  }),
  AuthProvider: ({ children }) => children,
}));

vi.mock('../../context/PermisosContext.jsx', () => ({
  usePermisos: () => ({
    permisos: ['*'],
    loading: false,
    tienePermiso: () => true,
    recargar: vi.fn(),
  }),
  PermisosProvider: ({ children }) => children,
}));

describe('Sidebar logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navega a /login después de cerrar sesión', async () => {
    mockSignOut.mockResolvedValue({});
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('muestra error si signOut falla y no navega', async () => {
    mockSignOut.mockRejectedValue(new Error('fallo red'));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
