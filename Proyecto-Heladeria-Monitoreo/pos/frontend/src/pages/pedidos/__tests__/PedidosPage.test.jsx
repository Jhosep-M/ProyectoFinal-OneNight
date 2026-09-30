import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import PedidosPage from '../PedidosPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarPedidos: vi.fn(),
  mockListarMesas: vi.fn(),
  mockProductosList: vi.fn(),
  mockCrearPedido: vi.fn(),
  mockActualizarPedido: vi.fn(),
  mockCobrarPedido: vi.fn(),
  mockVerPedido: vi.fn(),
  mockListarTurnos: vi.fn(),
  mockListarMetodos: vi.fn(),
}));

vi.mock('../../../services/pedidosService.js', () => ({
  listarPedidos: mocks.mockListarPedidos,
  crearPedido: mocks.mockCrearPedido,
  actualizarPedido: mocks.mockActualizarPedido,
  cobrarPedido: mocks.mockCobrarPedido,
  verPedido: mocks.mockVerPedido,
}));

vi.mock('../../../services/cajaService.js', () => ({ listarTurnos: mocks.mockListarTurnos }));
vi.mock('../../../services/ventasService.js', () => ({ listarMetodosPago: mocks.mockListarMetodos }));

vi.mock('../../../services/mesasService.js', () => ({ listarMesas: mocks.mockListarMesas }));
vi.mock('../../../services/productosService.js', () => ({ productosService: { list: mocks.mockProductosList } }));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));
vi.mock('../../../context/PermisosContext.jsx', () => ({ usePermisos: () => ({ permisos: ['*'], loading: false, tienePermiso: () => true, recargar: vi.fn() }), PermisosProvider: ({ children }) => children }));

function renderPedidos() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <PedidosPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('PedidosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p1', mesa_id: 'mesa-1', estado: 'pendiente', total: 50 },
    ]);
    mocks.mockListarMesas.mockResolvedValue([{ id_mesa: 'm1', numero: '1' }]);
    mocks.mockProductosList.mockResolvedValue([{ id_producto: 'pr1', nombre: 'Helado' }]);
    mocks.mockListarTurnos.mockResolvedValue([{ id_turno: 't1', estado: 'abierto' }]);
    mocks.mockListarMetodos.mockResolvedValue([{ id_metodo: 'mp1', nombre: 'Efectivo' }]);
  });

  it('carga y muestra pedidos', async () => {
    renderPedidos();
    expect(await screen.findByText('pendiente')).toBeInTheDocument();
  });

  it('cambiar estado llama al servicio', async () => {
    mocks.mockActualizarPedido.mockResolvedValue({});
    renderPedidos();
    await screen.findByText('pendiente');
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    await waitFor(() => {
      expect(mocks.mockActualizarPedido).toHaveBeenCalledWith('p1', { estado: 'listo' });
    });
  });

  it('crear pedido llama al servicio', async () => {
    mocks.mockCrearPedido.mockResolvedValue({ id_pedido: 'p2' });
    renderPedidos();
    await screen.findByText('pendiente');
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
    await userEvent.selectOptions(screen.getAllByRole('combobox')[1], 'pr1');
    await userEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));
    await waitFor(() => {
      expect(mocks.mockCrearPedido).toHaveBeenCalledWith(
        expect.objectContaining({ mesa_id: 'm1' })
      );
    });
  });

  it('cuenta agrupada: expande y muestra productos agregados', async () => {
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p1', mesa_id: 'm1', mesa_numero: 1, estado: 'abierto', total: 8, mesero_nombre: 'Ana' },
      { id_pedido: 'p2', mesa_id: 'm1', mesa_numero: 1, estado: 'abierto', total: 18, mesero_nombre: 'Ana' },
    ]);
    mocks.mockListarMesas.mockResolvedValue([{ id_mesa: 'm1', numero: 1, estado: 'ocupada' }]);
    mocks.mockVerPedido.mockImplementation(async (id) => ({
      id_pedido: id,
      detalles: id === 'p1'
        ? [{ producto_id: 'pr1', producto_nombre: 'Helado', cantidad: 1, precio_unitario: 8 }]
        : [{ producto_id: 'pr1', producto_nombre: 'Helado', cantidad: 2, precio_unitario: 9 }],
    }));
    renderPedidos();
    await screen.findAllByText('abierto');
    // preselecciona mesa m1 via combo para activar cuenta agrupada
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
    expect(await screen.findByText(/cuenta abierta/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Ver detalle/ }));
    await waitFor(() => {
      expect(mocks.mockVerPedido).toHaveBeenCalledWith('p1');
    });
    expect((await screen.findAllByText(/Helado/)).length).toBeGreaterThan(0);
  });

  it('cobrar cuenta llama a cobrarPedido por cada pedido abierto', async () => {
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p1', mesa_id: 'm1', mesa_numero: 1, estado: 'abierto', total: 8 },
      { id_pedido: 'p2', mesa_id: 'm1', mesa_numero: 1, estado: 'abierto', total: 18 },
    ]);
    mocks.mockListarMesas.mockResolvedValue([{ id_mesa: 'm1', numero: 1, estado: 'ocupada' }]);
    mocks.mockCobrarPedido.mockResolvedValue({});
    renderPedidos();
    await screen.findAllByText('abierto');
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'm1');
    await userEvent.click(await screen.findByRole('button', { name: /Cobrar cuenta/ }));
    await waitFor(() => {
      expect(mocks.mockCobrarPedido).toHaveBeenCalledTimes(2);
    });
  });

  it('sin Cobrar por fila con mesa; sí con mostrador', async () => {
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p1', mesa_id: 'm1', mesa_numero: 1, estado: 'abierto', total: 8 },
      { id_pedido: 'p2', mesa_id: null, estado: 'abierto', total: 5 },
    ]);
    renderPedidos();
    await screen.findAllByText('abierto');
    const cobrarBotones = screen.queryAllByRole('button', { name: 'Cobrar' });
    expect(cobrarBotones).toHaveLength(1);
    expect(screen.getByText('Se cobra en cuenta')).toBeInTheDocument();
  });
});
