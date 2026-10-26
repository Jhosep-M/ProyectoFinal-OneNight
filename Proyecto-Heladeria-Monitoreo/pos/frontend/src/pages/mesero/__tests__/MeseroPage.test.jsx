import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MeseroPage from '../MeseroPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarPedidos: vi.fn(),
  mockCrearPedido: vi.fn(),
  mockListarMesas: vi.fn(),
  mockProductosList: vi.fn(),
  mockCategoriasList: vi.fn(),
}));

vi.mock('../../../services/pedidosService.js', () => ({
  listarPedidos: mocks.mockListarPedidos,
  crearPedido: mocks.mockCrearPedido,
}));

vi.mock('../../../services/mesasService.js', () => ({
  listarMesas: mocks.mockListarMesas,
}));

vi.mock('../../../services/productosService.js', () => ({
  productosService: { list: mocks.mockProductosList },
  categoriasService: { list: mocks.mockCategoriasList },
}));

vi.mock('../../../context/PermisosContext.jsx', () => ({
  // Mesero: puede consultar/crear pedidos, ver mesas y catalogo.
  // NO tiene venta.crear (cobrar) ni pedido.gestionar (anular/cerrar).
  usePermisos: () => ({
    loading: false,
    tienePermiso: (p) =>
      ['pedido.consultar', 'pedido.crear', 'mesa.consultar', 'producto.consultar'].includes(p),
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

  it('no muestra Cobrar ni Anular para mesero', async () => {
    renderMesero();
    await screen.findAllByText(/Mesa 5/);
    expect(screen.queryByRole('button', { name: /Cobrar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anular/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrar/i })).not.toBeInTheDocument();
  });
});
