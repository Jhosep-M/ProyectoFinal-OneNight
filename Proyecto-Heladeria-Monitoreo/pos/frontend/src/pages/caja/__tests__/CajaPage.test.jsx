import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import CajaPage from '../CajaPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarTurnos: vi.fn(),
  mockListarVentas: vi.fn(),
  mockAbrirTurno: vi.fn(),
  mockCerrarTurno: vi.fn(),
}));

vi.mock('../../../services/cajaService.js', () => ({
  listarTurnos: mocks.mockListarTurnos,
  abrirTurno: mocks.mockAbrirTurno,
  cerrarTurno: mocks.mockCerrarTurno,
}));

vi.mock('../../../services/ventasService.js', () => ({
  listarVentas: mocks.mockListarVentas,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

function renderCaja() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <CajaPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('CajaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarTurnos.mockResolvedValue([
      { id_turno: 't1', fecha_apertura: '2026-09-28T08:00:00Z', monto_inicial: 100, estado: 'abierto' },
    ]);
    mocks.mockListarVentas.mockResolvedValue([]);
  });

  it('carga y muestra turno activo', async () => {
    renderCaja();
    expect(await screen.findByText('Turno Actual')).toBeInTheDocument();
    expect(screen.getAllByText(/abierto/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('cerrar turno llama al servicio con el id del turno', async () => {
    mocks.mockCerrarTurno.mockResolvedValue({});
    mocks.mockListarTurnos
      .mockResolvedValueOnce([
        { id_turno: 't1', fecha_apertura: '2026-09-28T08:00:00Z', monto_inicial: 100, estado: 'abierto' },
      ])
      .mockResolvedValue([]);
    renderCaja();
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar Turno/ }));
    await waitFor(() => {
      expect(mocks.mockCerrarTurno).toHaveBeenCalledWith('t1', expect.any(Number));
    });
  });

  it('abrir turno llama al servicio cuando no hay turno activo', async () => {
    mocks.mockListarTurnos.mockResolvedValue([]);
    mocks.mockAbrirTurno.mockResolvedValue({ id_turno: 't2' });
    renderCaja();
    expect(await screen.findByText('No hay un turno activo')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('monto inicial'), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => {
      expect(mocks.mockAbrirTurno).toHaveBeenCalledWith(200);
    });
  });

  it('muestra error cuando abrir falla', async () => {
    mocks.mockListarTurnos.mockResolvedValue([]);
    mocks.mockAbrirTurno.mockRejectedValueOnce(new Error('Ya hay un turno abierto'));
    renderCaja();
    await screen.findByText('No hay un turno activo');
    await userEvent.type(screen.getByPlaceholderText('monto inicial'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByText(/Ya hay un turno abierto/)).toBeInTheDocument();
  });
});
