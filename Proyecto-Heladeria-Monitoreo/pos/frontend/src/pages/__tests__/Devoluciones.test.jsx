import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Devoluciones from '../Devoluciones.jsx';

const mocks = vi.hoisted(() => ({
  mockListarDevoluciones: vi.fn(),
  mockCrearDevolucion: vi.fn(),
  mockAnularVenta: vi.fn(),
  mockListarVentas: vi.fn(),
  mockProductosList: vi.fn(),
}));

vi.mock('../../services/devolucionesService.js', () => ({
  listarDevoluciones: mocks.mockListarDevoluciones,
  crearDevolucion: mocks.mockCrearDevolucion,
  anularVenta: mocks.mockAnularVenta,
  listarVentas: mocks.mockListarVentas,
}));

vi.mock('../../services/productosService.js', () => ({
  productosService: { list: mocks.mockProductosList },
}));

vi.mock('../../context/PermisosContext.jsx', () => ({
  usePermisos: () => ({ permisos: ['*'], loading: false, tienePermiso: () => true, recargar: vi.fn() }),
  PermisosProvider: ({ children }) => children,
}));

const VENTA_ACTIVA = { id_venta: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', estado: 'activa', fecha: '2026-10-20T10:00:00Z', total: 50 };
const VENTA_ANULADA = { id_venta: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', estado: 'anulada', fecha: '2026-10-19T10:00:00Z', total: 30 };
const PRODUCTO = { id_producto: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', nombre: 'Helado Vainilla', precio: 25 };

function renderPage() {
  return render(
    <MemoryRouter>
      <Devoluciones />
    </MemoryRouter>
  );
}

describe('Devoluciones (HU-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarDevoluciones.mockResolvedValue([
      { id_devolucion: 'd1', producto_nombre: 'Helado Vainilla', cantidad: 1, motivo: 'derretido', fecha: '2026-10-20T11:00:00Z' },
    ]);
    mocks.mockListarVentas.mockResolvedValue([VENTA_ACTIVA, VENTA_ANULADA]);
    mocks.mockProductosList.mockResolvedValue([PRODUCTO]);
  });

  it('lista devoluciones en el historial', async () => {
    renderPage();
    expect(await screen.findByText('Helado Vainilla')).toBeInTheDocument();
    expect(screen.getByText('derretido')).toBeInTheDocument();
  });

  it('filtra solo ventas activas (anuladas fuera del select y del conteo)', async () => {
    renderPage();
    const ventaSelect = await screen.findByLabelText(/Venta activa/);
    const opciones = within(ventaSelect).getAllByRole('option').map((o) => o.value);
    expect(opciones).toContain(VENTA_ACTIVA.id_venta);
    expect(opciones).not.toContain(VENTA_ANULADA.id_venta);
    expect(await screen.findByText(/Ventas anulables \(1\)/)).toBeInTheDocument();
  });

  it('crear devolución con cantidad mayor a la vendida muestra error humano sin stack', async () => {
    mocks.mockCrearDevolucion.mockRejectedValueOnce(
      new Error('devuelve más de lo vendido (2 vendido, 1 ya devuelto)')
    );
    renderPage();
    await userEvent.selectOptions(await screen.findByLabelText(/Venta activa/), VENTA_ACTIVA.id_venta);
    await userEvent.selectOptions(screen.getByLabelText('Producto'), PRODUCTO.id_producto);
    await userEvent.clear(screen.getByLabelText('Cantidad'));
    await userEvent.type(screen.getByLabelText('Cantidad'), '5');
    await userEvent.type(screen.getByLabelText(/Motivo \(mínimo 5 caracteres\)/), 'producto en mal estado');
    await userEvent.click(screen.getByRole('button', { name: /Procesar devolución/ }));

    await waitFor(() => {
      expect(mocks.mockCrearDevolucion).toHaveBeenCalledWith({
        venta_id: VENTA_ACTIVA.id_venta,
        producto_id: PRODUCTO.id_producto,
        cantidad: 5,
        motivo: 'producto en mal estado',
      });
    });
    expect(await screen.findByText(/más de lo vendido/i)).toBeInTheDocument();
    expect(screen.queryByText(/at Object|stack trace/i)).not.toBeInTheDocument();
  });

  it('anular pide motivo y confirma restauración de inventario', async () => {
    mocks.mockAnularVenta.mockResolvedValueOnce({ ok: true });
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('cliente arrepentido');
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Anular' }));

    expect(promptSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(mocks.mockAnularVenta).toHaveBeenCalledWith(VENTA_ACTIVA.id_venta, 'cliente arrepentido');
    });
    expect(await screen.findByText(/anulada y stock restaurado/i)).toBeInTheDocument();
    promptSpy.mockRestore();
  });
});
