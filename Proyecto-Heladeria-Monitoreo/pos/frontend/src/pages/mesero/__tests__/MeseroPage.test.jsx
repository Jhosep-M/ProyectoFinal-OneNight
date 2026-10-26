import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MeseroPage from '../MeseroPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarPedidos: vi.fn(),
  mockCrearPedido: vi.fn(),
  mockCobrarPedido: vi.fn(),
  mockListarMesas: vi.fn(),
  mockProductosList: vi.fn(),
  mockCategoriasList: vi.fn(),
  mockTurnoAbierto: vi.fn(),
  mockListarMetodos: vi.fn(),
}));

vi.mock('../../../services/pedidosService.js', () => ({
  listarPedidos: mocks.mockListarPedidos,
  crearPedido: mocks.mockCrearPedido,
  cobrarPedido: mocks.mockCobrarPedido,
}));

vi.mock('../../../services/cajaService.js', () => ({
  listarTurnoAbiertoParaCobro: mocks.mockTurnoAbierto,
}));

vi.mock('../../../services/ventasService.js', () => ({
  listarMetodosPago: mocks.mockListarMetodos,
}));

vi.mock('../../../services/mesasService.js', () => ({
  listarMesas: mocks.mockListarMesas,
}));

vi.mock('../../../services/productosService.js', () => ({
  productosService: { list: mocks.mockProductosList },
  categoriasService: { list: mocks.mockCategoriasList },
}));

vi.mock('../../../context/PermisosContext.jsx', () => ({
  // Opción A (023): mesero cobra en turno de caja.
  // Tiene venta.crear + pago.consultar; NO tiene pedido.gestionar ni turno.*.
  usePermisos: () => ({
    loading: false,
    tienePermiso: (p) =>
      ['pedido.consultar', 'pedido.crear', 'mesa.consultar', 'producto.consultar', 'venta.crear', 'pago.consultar'].includes(p),
  }),
  PermisosProvider: ({ children }) => children,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: { user: { id: 'u-mesero-1', email: 'mesero@h.com' } }, loading: false }),
  AuthProvider: ({ children }) => children,
}));

function renderMesero() {
  return render(
    <MemoryRouter>
      <MeseroPage />
    </MemoryRouter>
  );
}

describe('MeseroPage (HU-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p-1', mesa_id: 'm-1', mesa_numero: 5, mesero_nombre: 'Ana', estado: 'abierto', total: 30 },
    ]);
    mocks.mockListarMesas.mockResolvedValue([{ id_mesa: 'm-1', numero: 5, estado: 'ocupada' }]);
    mocks.mockProductosList.mockResolvedValue([{ id_producto: 'pr-1', nombre: 'Helado', precio: 15 }]);
    mocks.mockCategoriasList.mockResolvedValue([]);
    mocks.mockTurnoAbierto.mockResolvedValue({ id_turno: 't-caja', estado: 'abierto', cajero_email: 'caja@h.com' });
    mocks.mockListarMetodos.mockResolvedValue([{ id_metodo_pago: 'mp-1', nombre: 'Efectivo' }]);
    mocks.mockCobrarPedido.mockResolvedValue({ venta_id: 'v-1' });
  });

  it('muestra solo pendientes y permite crear pedido a mesa', async () => {
    renderMesero();
    expect(await screen.findByText(/Mis pedidos/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Mesa 5/)).length).toBeGreaterThan(0);
    const selects = await screen.findAllByRole('combobox');
    await userEvent.selectOptions(selects[1], 'pr-1');
    await userEvent.click(await screen.findByRole('button', { name: /Crear pedido/i }));
    await waitFor(() => {
      expect(mocks.mockCrearPedido).toHaveBeenCalled();
    });
  });

  it('no ofrece Cobrar: muestra que se cobra en caja', async () => {
    renderMesero();
    await screen.findAllByText(/Mesa 5/);
    expect(screen.queryByRole('button', { name: /Cobrar/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/se cobra en caja/i)).toBeInTheDocument();
    expect(mocks.mockCobrarPedido).not.toHaveBeenCalled();
  });

  it('no muestra Anular ni Cerrar para mesero', async () => {
    renderMesero();
    await screen.findAllByText(/Mesa 5/);
    expect(screen.queryByRole('button', { name: /Anular/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrar/i })).not.toBeInTheDocument();
  });
});
