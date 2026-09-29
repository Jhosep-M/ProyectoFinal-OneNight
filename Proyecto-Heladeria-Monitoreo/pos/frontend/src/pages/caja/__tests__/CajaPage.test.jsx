import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import CajaPage from '../CajaPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarTurnos: vi.fn(),
  mockAbrirTurno: vi.fn(),
  mockCerrarTurno: vi.fn(),
}));

vi.mock('../../../services/cajaService.js', () => ({
  listarTurnos: mocks.mockListarTurnos,
  abrirTurno: mocks.mockAbrirTurno,
  cerrarTurno: mocks.mockCerrarTurno,
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
      { id_turno: 't1', fecha_apertura: '2026-09-28T08:00:00Z', monto_inicial: 100, estado: 'abierto', diferencia: null },
    ]);
  });

  it('carga y muestra turnos', async () => {
    renderCaja();
    expect(await screen.findByText('100')).toBeInTheDocument();
    expect(screen.getByText('abierto')).toBeInTheDocument();
  });

  it('abrir turno llama al servicio', async () => {
    mocks.mockAbrirTurno.mockResolvedValue({ id_turno: 't2' });
    renderCaja();
    await screen.findByText('100');
    await userEvent.type(screen.getByPlaceholderText('monto inicial'), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => {
      expect(mocks.mockAbrirTurno).toHaveBeenCalledWith(200);
    });
  });

  it('muestra error cuando abrir falla', async () => {
    mocks.mockAbrirTurno.mockRejectedValueOnce(new Error('Ya hay un turno abierto'));
    renderCaja();
    await screen.findByText('100');
    await userEvent.type(screen.getByPlaceholderText('monto inicial'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByText(/Ya hay un turno abierto/)).toBeInTheDocument();
  });
});
