import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TurnosAdminPage from '../TurnosAdminPage.jsx';

const mocks = vi.hoisted(() => ({
  mockTodos: vi.fn(),
  mockPermisos: vi.fn(),
  mockCerrar: vi.fn(),
}));

vi.mock('../../../services/cajaService.js', () => ({
  listarTodosTurnos: mocks.mockTodos,
  obtenerPermisosTurno: mocks.mockPermisos,
  cerrarTurno: mocks.mockCerrar,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <TurnosAdminPage />
    </MemoryRouter>
  );
}

describe('TurnosAdminPage (Opción 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockPermisos.mockResolvedValue({ puedeCerrarTodos: false, puedeConsultarTodos: true });
    mocks.mockTodos.mockResolvedValue([
      { id_turno: 't1', usuario_id: 'u-a', cajero_email: 'a@x.com', fecha_apertura: '2026-09-28T08:00:00Z', estado: 'abierto' },
      { id_turno: 't2', usuario_id: 'u-b', cajero_email: 'b@x.com', fecha_apertura: '2026-09-28T09:00:00Z', estado: 'cerrado' },
    ]);
  });

  it('muestra todas las cajas con dueño', async () => {
    renderPage();
    expect(await screen.findByText(/todas las cajas/i)).toBeInTheDocument();
    expect(await screen.findByText('a@x.com')).toBeInTheDocument();
    expect(await screen.findByText('b@x.com')).toBeInTheDocument();
  });

  it('supervisor ve sin botón cerrar', async () => {
    renderPage();
    await screen.findByText('a@x.com');
    expect(screen.queryByRole('button', { name: /Cerrar como admin/ })).not.toBeInTheDocument();
  });

  it('admin cierra ajeno con motivo obligatorio', async () => {
    mocks.mockPermisos.mockResolvedValue({ puedeCerrarTodos: true, puedeConsultarTodos: true });
    mocks.mockCerrar.mockResolvedValue({});
    mocks.mockTodos.mockResolvedValueOnce([
      { id_turno: 't1', usuario_id: 'u-a', cajero_email: 'a@x.com', fecha_apertura: '2026-09-28T08:00:00Z', estado: 'abierto' },
    ]).mockResolvedValue([]);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar como admin/ }));
    // Motivo bloquea confirmar hasta escribir >=3
    expect(screen.getByRole('button', { name: /Confirmar cierre/ })).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/Cajero ausente/i), 'Cajero ausente');
    const monto = screen.getByLabelText(/Efectivo contado/i);
    await userEvent.clear(monto);
    await userEvent.type(monto, '50');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar cierre/ }));
    await waitFor(() => {
      expect(mocks.mockCerrar).toHaveBeenCalledWith('t1', { monto_final_real: 50, motivo: 'Cajero ausente' });
    });
  });
});
