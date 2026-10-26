import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HistorialVentas from '../HistorialVentas.jsx';

const mocks = vi.hoisted(() => ({
  mockListarVentas: vi.fn(),
  mockListarMetodosPago: vi.fn(),
}));

vi.mock('../../../services/ventasService.js', () => ({
  listarVentas: mocks.mockListarVentas,
  listarMetodosPago: mocks.mockListarMetodosPago,
}));

vi.mock('../../../context/PermisosContext.jsx', () => ({
  usePermisos: () => ({ permisos: ['*'], loading: false, tienePermiso: () => true, recargar: vi.fn() }),
  PermisosProvider: ({ children }) => children,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <HistorialVentas />
    </MemoryRouter>
  );
}

describe('HistorialVentas (HU-14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarMetodosPago.mockResolvedValue([
      { id_metodo_pago: 'm-efectivo', nombre: 'Efectivo' },
    ]);
    mocks.mockListarVentas.mockResolvedValue([
      { id_venta: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fecha: '2026-10-20T10:00:00Z', total: 50, estado: 'activa', turno_id: 't1' },
    ]);
  });

  it('carga inicial sin filtros llama al servicio sin params', async () => {
    renderPage();
    await waitFor(() => {
      expect(mocks.mockListarVentas).toHaveBeenCalledWith({});
    });
    expect(await screen.findByText(/Ventas \(1\)/)).toBeInTheDocument();
  });

  it('filtrar por estado y fecha llama con params correctos', async () => {
    renderPage();
    await screen.findByText(/Ventas \(1\)/);

    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'anulada');
    // Inputs date sin id: se ubican por aria-label.
    const desde = screen.getByLabelText('Fecha desde');
    const hasta = screen.getByLabelText('Fecha hasta');
    await userEvent.type(desde, '2026-10-01');
    await userEvent.type(hasta, '2026-10-31');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() => {
      expect(mocks.mockListarVentas).toHaveBeenLastCalledWith({
        desde: '2026-10-01',
        hasta: '2026-10-31',
        estado: 'anulada',
        cajero: '',
        metodo: '',
      });
    });
  });

  it('muestra error humano si el backend rechaza el filtro', async () => {
    mocks.mockListarVentas
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('estado debe ser activa|anulada'));
    renderPage();
    await screen.findByText('Sin ventas');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByText(/activa\|anulada/)).toBeInTheDocument();
  });
});
