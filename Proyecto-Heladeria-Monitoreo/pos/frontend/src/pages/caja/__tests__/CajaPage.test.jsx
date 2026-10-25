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
    // mockReset (no solo clear): elimina implementaciones/once heredadas
    // entre tests para que un ResolvedOnce no consumido no contamine al siguiente.
    mocks.mockCerrarTurno.mockReset();
    mocks.mockAbrirTurno.mockReset();
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

  it('muestra en vivo esperado, diferencia y umbral antes de confirmar', async () => {
    mocks.mockCerrarTurno.mockResolvedValue({});
    renderCaja();
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar Turno/ }));
    const input = await screen.findByLabelText(/Efectivo contado/i);
    await userEvent.clear(input);
    await userEvent.type(input, '120');
    // Esperado aprox = monto_inicial 100 + 0 ventas; dif 20 dentro de tolerancia.
    expect(await screen.findByText(/Umbral:/)).toBeInTheDocument();
    expect(screen.getByText(/diferencia dentro de la tolerancia/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar cierre/ })).toBeEnabled();
  });

  it('bloquea Confirmar en cliente si la diferencia es crítica (>= 2x umbral)', async () => {
    renderCaja();
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar Turno/ }));
    const input = await screen.findByLabelText(/Efectivo contado/i);
    await userEvent.clear(input);
    await userEvent.type(input, '250');
    expect(await screen.findByText(/requiere supervisor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar cierre/ })).toBeDisabled();
  });

  it('ante 422 MOTIVO_REQUERIDO el modal pide motivo y reintenta con él', async () => {
    const err422 = new Error('La diferencia supera el umbral permitido. Ingresa un motivo para cerrar.');
    err422.status = 422;
    err422.code = 'MOTIVO_REQUERIDO';
    err422.payload = { code: 'MOTIVO_REQUERIDO', diferencia: 70, montoEsperado: 100, umbral: 50 };
    mocks.mockCerrarTurno.mockRejectedValueOnce(err422);
    renderCaja();
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar Turno/ }));
    const input = await screen.findByLabelText(/Efectivo contado/i);
    await userEvent.clear(input);
    await userEvent.type(input, '170');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar cierre/ }));

    // El modal sigue abierto y ahora exige un motivo (>=5).
    const motivoInput = await screen.findByLabelText(/Motivo \(obligatorio: diferencia/i);
    expect(motivoInput).toBeInTheDocument();

    mocks.mockCerrarTurno.mockResolvedValueOnce({});
    await userEvent.type(motivoInput, 'faltante de caja');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar cierre/ }));
    await waitFor(() => {
      expect(mocks.mockCerrarTurno).toHaveBeenLastCalledWith('t1', { monto_final_real: 170, motivo: 'faltante de caja' });
    });
  });

  it('ante 409 DIFERENCIA_CRITICA el modal sigue abierto y muestra supervisor', async () => {
    const err409 = new Error('Diferencia crítica, requiere supervisor.');
    err409.status = 409;
    err409.code = 'DIFERENCIA_CRITICA';
    err409.payload = { code: 'DIFERENCIA_CRITICA', diferencia: 150, montoEsperado: 100, umbral: 50 };
    mocks.mockCerrarTurno.mockRejectedValueOnce(err409);
    // Primer intento: monto no crítico en cliente (170, dif 70) para que el
    // botón esté habilitado; el servidor responde 409 crítico.
    renderCaja();
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar Turno/ }));
    const input = await screen.findByLabelText(/Efectivo contado/i);
    await userEvent.clear(input);
    await userEvent.type(input, '170');
    const motivoInput = await screen.findByLabelText(/Motivo \(obligatorio: diferencia/i);
    await userEvent.type(motivoInput, 'faltante de caja');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar cierre/ }));

    expect(await screen.findByText(/requiere supervisor/i)).toBeInTheDocument();
    // El modal no se cierra: el input sigue visible y solo hubo un intento.
    expect(screen.getByLabelText(/Efectivo contado/i)).toBeInTheDocument();
    expect(mocks.mockCerrarTurno).toHaveBeenCalledTimes(1);
  });
});
