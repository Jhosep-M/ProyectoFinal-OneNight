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
}));

vi.mock('../../../services/pedidosService.js', () => ({
  listarPedidos: mocks.mockListarPedidos,
  crearPedido: mocks.mockCrearPedido,
  actualizarPedido: mocks.mockActualizarPedido,
  cobrarPedido: vi.fn(),
}));

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
});
