import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import MesasPage from '../MesasPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockVer: vi.fn(),
  mockCrear: vi.fn(),
  mockActualizar: vi.fn(),
}));

vi.mock('../../../services/mesasService.js', () => ({
  listarMesas: mocks.mockListar,
  verMesa: mocks.mockVer,
  crearMesa: mocks.mockCrear,
  actualizarMesa: mocks.mockActualizar,
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
      { id_mesa: 'm1', numero: 1, estado: 'libre' },
      { id_mesa: 'm2', numero: 2, estado: 'ocupada' },
    ]);
    mocks.mockVer.mockImplementation(async (id) =>
      ({ id_mesa: id, numero: id === 'm1' ? 1 : 2, estado: id === 'm1' ? 'libre' : 'ocupada' })
    );
  });

  it('carga y muestra mesas', async () => {
    renderMesas();
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('Libre').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ocupada').length).toBeGreaterThan(0);
  });

  it('crear mesa llama al servicio con el siguiente número', async () => {
    mocks.mockCrear.mockResolvedValue({ id_mesa: 'm3', numero: 3, estado: 'libre' });
    renderMesas();
    await screen.findByText('1');
    await userEvent.click(screen.getByRole('button', { name: /Nueva Mesa/ }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith(3);
    });
  });

  it('liberar mesa llama al servicio', async () => {
    mocks.mockActualizar.mockResolvedValue({ id_mesa: 'm2', numero: 2, estado: 'libre' });
    renderMesas();
    await screen.findByText('2');
    await userEvent.click(screen.getByText('2'));
    await userEvent.click(await screen.findByRole('button', { name: /Liberar Mesa/ }));
    await waitFor(() => {
      expect(mocks.mockActualizar).toHaveBeenCalledWith('m2', { estado: 'libre' });
    });
  });
});
