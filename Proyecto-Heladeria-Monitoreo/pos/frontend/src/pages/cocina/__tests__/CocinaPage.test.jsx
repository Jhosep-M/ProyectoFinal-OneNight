import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CocinaPage from '../CocinaPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarPedidos: vi.fn(),
  mockActualizarEstado: vi.fn(),
}));

vi.mock('../../../services/pedidosService.js', () => ({
  listarPedidos: mocks.mockListarPedidos,
  actualizarEstadoPedido: mocks.mockActualizarEstado,
}));

vi.mock('../../../context/PermisosContext.jsx', () => ({
  // Cocina: consulta pedidos y avanza estado. Sin venta.* (caja/ventas).
  usePermisos: () => ({
    loading: false,
    tienePermiso: (p) => ['pedido.consultar', 'pedido.estado', 'mesa.consultar'].includes(p),
  }),
  PermisosProvider: ({ children }) => children,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: { user: { id: 'u-cocina-1', email: 'cocina@h.com' } }, loading: false }),
  AuthProvider: ({ children }) => children,
}));

function renderCocina() {
  return render(
    <MemoryRouter>
      <CocinaPage />
    </MemoryRouter>
  );
}

describe('CocinaPage (HU-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p-1', mesa_numero: 5, estado: 'abierto', total: 30 },
      { id_pedido: 'p-2', mesa_numero: 3, estado: 'en_preparacion', total: 20 },
    ]);
    mocks.mockActualizarEstado.mockImplementation(async (id, estado) => ({ id_pedido: id, estado }));
  });

  it('muestra pendientes y avanza abierto -> en_preparacion', async () => {
    renderCocina();
    expect(await screen.findByRole('heading', { name: /^Cocina$/ })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /A preparación/i }));
    await waitFor(() => {
      expect(mocks.mockActualizarEstado).toHaveBeenCalledWith('p-1', 'en_preparacion');
    });
  });

  it('muestra error humano 409 sin romper la lista', async () => {
    const err = new Error("No se puede pasar el pedido de 'listo' a 'abierto'");
    err.status = 409;
    mocks.mockActualizarEstado.mockRejectedValueOnce(err);
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p-9', mesa_numero: 7, estado: 'listo', total: 10 },
    ]);
    renderCocina();
    expect(await screen.findByText(/Mesa 7/)).toBeInTheDocument();
  });

  it('no llama a ventas ni muestra cobrar', async () => {
    renderCocina();
    await screen.findByRole('heading', { name: /^Cocina$/ });
    expect(screen.queryByRole('button', { name: /Cobrar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anular/i })).not.toBeInTheDocument();
  });
});
