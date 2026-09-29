import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import MesasPage from '../MesasPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockCrear: vi.fn(),
}));

vi.mock('../../../services/mesasService.js', () => ({
  listarMesas: mocks.mockListar,
  crearMesa: mocks.mockCrear,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

function renderMesas() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <MesasPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('MesasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListar.mockResolvedValue([
      { id_mesa: 'm1', numero: '1', estado: 'activa' },
      { id_mesa: 'm2', numero: '2', estado: 'activa' },
    ]);
  });

  it('carga y muestra mesas', async () => {
    renderMesas();
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('crear mesa llama al servicio', async () => {
    mocks.mockCrear.mockResolvedValue({ id_mesa: 'm3' });
    renderMesas();
    await screen.findByText('1');
    await userEvent.type(screen.getByPlaceholderText('número'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith('3');
    });
  });
});
