import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import CajaPage from '../CajaPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarMisTurnos: vi.fn(),
  mockListarVentas: vi.fn(),
  mockAbrirTurno: vi.fn(),
  mockCerrarTurno: vi.fn(),
}));

vi.mock('../../../services/cajaService.js', () => ({
  listarMisTurnos: mocks.mockListarMisTurnos,
  listarVentas: undefined,
  abrirTurno: mocks.mockAbrirTurno,
  cerrarTurno: mocks.mockCerrarTurno,
}));

vi.mock('../../../services/ventasService.js', () => ({
  listarVentas: mocks.mockListarVentas,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: { user: { id: 'u-mio', email: 'c@h.com' } }, loading: false, signOut: vi.fn() }),
  AuthProvider: ({ children }) => children,
}));

function renderCaja() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <CajaPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('CajaPage (Solo mío)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarMisTurnos.mockResolvedValue([
      { id_turno: 't1', usuario_id: 'u-mio', fecha_apertura: '2026-09-28T08:00:00Z', monto_inicial: 100, estado: 'abierto', cajero_email: 'c@h.com' },
    ]);
    mocks.mockListarVentas.mockResolvedValue([]);
  });

  it('carga y muestra mi turno activo con dueño', async () => {
    renderCaja();
    expect(await screen.findByText('Turno Actual')).toBeInTheDocument();
    expect(screen.getAllByText(/abierto/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/c@h\.com/)).toBeInTheDocument();
  });

  it('cerrar turno abre modal y confirma con monto contado', async () => {
    mocks.mockCerrarTurno.mockResolvedValue({});
    mocks.mockListarMisTurnos
      .mockResolvedValueOnce([
        { id_turno: 't1', usuario_id: 'u-mio', fecha_apertura: '2026-09-28T08:00:00Z', monto_inicial: 100, estado: 'abierto' },
      ])
      .mockResolvedValue([]);
    renderCaja();
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar Turno/ }));
    const input = await screen.findByLabelText(/Efectivo contado/i);
    await userEvent.clear(input);
    await userEvent.type(input, '120');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar cierre/ }));
    await waitFor(() => {
      expect(mocks.mockCerrarTurno).toHaveBeenCalledWith('t1', { monto_final_real: 120 });
    });
  });

  it('sin turno propio muestra abrir aunque haya ajenos (no los lista aquí)', async () => {
    mocks.mockListarMisTurnos.mockResolvedValue([]);
    mocks.mockAbrirTurno.mockResolvedValue({ id_turno: 't2' });
    renderCaja();
    expect(await screen.findByText('No hay un turno activo')).toBeInTheDocument();
    expect(screen.queryByText(/solo lectura/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrar como admin/ })).not.toBeInTheDocument();
  });

  it('abrir turno llama al servicio', async () => {
    mocks.mockListarMisTurnos.mockResolvedValue([]);
    mocks.mockAbrirTurno.mockResolvedValue({ id_turno: 't2' });
    renderCaja();
    await screen.findByText('No hay un turno activo');
    await userEvent.type(screen.getByPlaceholderText('monto inicial'), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => {
      expect(mocks.mockAbrirTurno).toHaveBeenCalledWith(200);
    });
  });

  it('muestra error cuando abrir falla', async () => {
    mocks.mockListarMisTurnos.mockResolvedValue([]);
    mocks.mockAbrirTurno.mockRejectedValueOnce(new Error('Ya hay un turno abierto'));
    renderCaja();
    await screen.findByText('No hay un turno activo');
    await userEvent.type(screen.getByPlaceholderText('monto inicial'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByText(/Ya hay un turno abierto/)).toBeInTheDocument();
  });
});
