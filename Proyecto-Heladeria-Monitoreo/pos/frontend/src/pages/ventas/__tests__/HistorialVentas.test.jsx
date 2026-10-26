import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HistorialVentas from '../HistorialVentas.jsx';

const mocks = vi.hoisted(() => ({
  mockListarVentas: vi.fn(),
  mockListarMetodosPago: vi.fn(),
  mockAnularVenta: vi.fn(),
  mockActualizarPedido: vi.fn(),
}));

vi.mock('../../../services/ventasService.js', () => ({
  listarVentas: mocks.mockListarVentas,
  listarMetodosPago: mocks.mockListarMetodosPago,
  anularVenta: mocks.mockAnularVenta,
}));

vi.mock('../../../services/pedidosService.js', () => ({
  actualizarPedido: mocks.mockActualizarPedido,
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

  it('muestra Anular solo en ventas activas', async () => {
    mocks.mockListarVentas.mockResolvedValue([
      { id_venta: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fecha: '2026-10-20T10:00:00Z', total: 50, estado: 'activa', turno_id: 't1' },
      { id_venta: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', fecha: '2026-10-20T11:00:00Z', total: 30, estado: 'anulada', turno_id: 't1' },
    ]);
    renderPage();
    await screen.findByText(/Ventas \(2\)/);
    expect(screen.getAllByRole('button', { name: 'Anular' })).toHaveLength(1);
  });

  it('anular pide motivo >=5 y llama al servicio con exito', async () => {
    mocks.mockAnularVenta.mockResolvedValue({ ok: true });
    renderPage();
    await screen.findByText(/Ventas \(1\)/);
    await userEvent.click(screen.getByRole('button', { name: 'Anular' }));
    expect(await screen.findByText(/Anular venta/)).toBeInTheDocument();
    // Botón deshabilitado sin motivo válido.
    expect(screen.getByRole('button', { name: /Confirmar anulación/ })).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/Cliente devolvió/), 'error de cobro en mostrador');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar anulación/ }));
    await waitFor(() => {
      expect(mocks.mockAnularVenta).toHaveBeenCalledWith(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'error de cobro en mostrador'
      );
    });
    expect(await screen.findByText(/anulada\. Stock y puntos revertidos/)).toBeInTheDocument();
  });

  it('anular tambien cancela el pedido espejo cuando hay pedido_id', async () => {
    mocks.mockListarVentas.mockResolvedValue([
      { id_venta: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pedido_id: 'p-1', fecha: '2026-10-20T10:00:00Z', total: 50, estado: 'activa', turno_id: 't1' },
    ]);
    mocks.mockAnularVenta.mockResolvedValue({ ok: true });
    mocks.mockActualizarPedido.mockResolvedValue({});
    renderPage();
    await screen.findByText(/Ventas \(1\)/);
    await userEvent.click(screen.getByRole('button', { name: 'Anular' }));
    await userEvent.type(screen.getByPlaceholderText(/Cliente devolvió/), 'error de cobro en mostrador');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar anulación/ }));
    await waitFor(() => {
      expect(mocks.mockActualizarPedido).toHaveBeenCalledWith('p-1', { estado: 'cancelado' });
    });
  });

  it('muestra error del backend al anular (409 ya anulada)', async () => {
    mocks.mockAnularVenta.mockRejectedValue(new Error('La venta no está activa'));
    renderPage();
    await screen.findByText(/Ventas \(1\)/);
    await userEvent.click(screen.getByRole('button', { name: 'Anular' }));
    await userEvent.type(screen.getByPlaceholderText(/Cliente devolvió/), 'motivo valido aqui');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar anulación/ }));
    expect(await screen.findByText(/no está activa/)).toBeInTheDocument();
  });
});
