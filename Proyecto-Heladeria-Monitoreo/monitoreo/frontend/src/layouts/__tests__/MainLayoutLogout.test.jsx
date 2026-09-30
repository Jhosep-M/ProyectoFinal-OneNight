import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from '../MainLayout.jsx';

const navigateSpy = vi.fn();
const mockCerrarSesion = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    sesion: { user: { email: 'operador@planta.bo' } },
    perfil: { nombre: 'Operador' },
    orgSeleccionada: null,
    setOrgSeleccionada: vi.fn(),
    cargando: false,
    iniciarSesion: vi.fn(),
    cerrarSesion: mockCerrarSesion,
  }),
}));

vi.mock('../../services/alertasService', () => ({
  listar: vi.fn().mockResolvedValue({ data: [] }),
}));

describe('MainLayout logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navega a /login después de cerrar sesión', async () => {
    mockCerrarSesion.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    expect(mockCerrarSesion).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('muestra error si cerrar sesión falla y no navega', async () => {
    mockCerrarSesion.mockRejectedValue(new Error('fallo red'));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    expect(mockCerrarSesion).toHaveBeenCalledTimes(1);
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
