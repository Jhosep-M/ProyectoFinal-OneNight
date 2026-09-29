import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import VentasPage from '../VentasPage.jsx';

const mocks = vi.hoisted(() => ({
  mockProductosList: vi.fn(),
  mockCategoriasList: vi.fn(),
  mockListarTurnos: vi.fn(),
  mockListarMetodos: vi.fn(),
  mockCrearVenta: vi.fn(),
}));

vi.mock('../../../services/productosService.js', () => ({
  productosService: { list: mocks.mockProductosList },
  categoriasService: { list: mocks.mockCategoriasList },
}));

vi.mock('../../../services/cajaService.js', () => ({
  listarTurnos: mocks.mockListarTurnos,
}));

vi.mock('../../../services/ventasService.js', () => ({
  listarVentas: vi.fn(),
  listarMetodosPago: mocks.mockListarMetodos,
  crearVenta: mocks.mockCrearVenta,
  anularVenta: vi.fn(),
  crearDevolucion: vi.fn(),
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

function renderVentas() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <VentasPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('VentasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockProductosList.mockResolvedValue([
      { id_producto: 'prod-1', nombre: 'Helado Chocolate', precio: 50, categoria_id: 'cat-1' },
    ]);
    mocks.mockCategoriasList.mockResolvedValue([
      { id_categoria: 'cat-1', nombre: 'Helados' },
    ]);
    mocks.mockListarTurnos.mockResolvedValue([
      { id_turno: 'turno-123', estado: 'abierto' },
    ]);
    mocks.mockListarMetodos.mockResolvedValue([
      { id_metodo: 'm1', nombre: 'Efectivo' },
    ]);
  });

  it('carga y muestra productos', async () => {
    renderVentas();
    expect(await screen.findByText('Helado Chocolate')).toBeInTheDocument();
    expect(screen.getByText('Helados')).toBeInTheDocument();
  });

  it('agregar y cobrar llama al servicio con turno y método de pago', async () => {
    mocks.mockCrearVenta.mockResolvedValue({ venta_id: 'v2' });
    renderVentas();
    await userEvent.click(await screen.findByText('Helado Chocolate'));
    await userEvent.click(await screen.findByRole('button', { name: /Cobrar/ }));
    await waitFor(() => {
      expect(mocks.mockCrearVenta).toHaveBeenCalledWith(
        expect.objectContaining({
          turno_id: 'turno-123',
          items: [{ producto_id: 'prod-1', cantidad: 1 }],
        })
      );
    });
    const payload = mocks.mockCrearVenta.mock.calls[0][0];
    expect(payload.pagos[0].metodo_pago_id).toBe('m1');
    expect(payload.pagos[0].monto).toBeGreaterThan(0);
  });

  it('sin turno abierto muestra aviso y deshabilita cobrar', async () => {
    mocks.mockListarTurnos.mockResolvedValue([]);
    renderVentas();
    await userEvent.click(await screen.findByText('Helado Chocolate'));
    expect(await screen.findByText(/Sin turno abierto/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cobrar/ })).toBeDisabled();
    expect(mocks.mockCrearVenta).not.toHaveBeenCalled();
  });

  it('muestra error cuando cargar falla', async () => {
    mocks.mockProductosList.mockRejectedValueOnce(new Error('Sin conexión'));
    mocks.mockCategoriasList.mockResolvedValue([]);
    renderVentas();
    expect(await screen.findByText(/No se pudieron cargar los productos/)).toBeInTheDocument();
  });
});
