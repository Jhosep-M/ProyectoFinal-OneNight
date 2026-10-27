import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CocinaPage from '../CocinaPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarPedidos: vi.fn(),
  mockActualizarEstado: vi.fn(),
  mockVerPedido: vi.fn(),
}));

vi.mock('../../../services/pedidosService.js', () => ({
  listarPedidos: mocks.mockListarPedidos,
  actualizarEstadoPedido: mocks.mockActualizarEstado,
  verPedido: mocks.mockVerPedido,
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
      { id_pedido: 'p-1', mesa_numero: 5, estado: 'abierto', total: 30, fecha: new Date().toISOString() },
      { id_pedido: 'p-2', mesa_numero: 3, estado: 'en_preparacion', total: 20, fecha: new Date().toISOString() },
    ]);
    mocks.mockVerPedido.mockResolvedValue({
      id_pedido: 'p-1',
      detalles: [{ producto_nombre: 'Cono Triple', cantidad: 2, precio_unitario: 25 }],
    });
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

  it('congela el tiempo en listo con fecha_listo (no sigue creciendo)', async () => {
    const base = new Date('2026-10-26T10:00:00Z').toISOString();
    const listoEn = new Date('2026-10-26T10:12:00Z').toISOString();
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p-listo', mesa_numero: null, estado: 'listo', total: 12, fecha: base, fecha_listo: listoEn },
    ]);
    mocks.mockVerPedido.mockResolvedValue({ id_pedido: 'p-listo', detalles: [] });
    renderCocina();
    // Tiempo congelado: tardó 12 min, no "X min en espera" creciente.
    expect(await screen.findByText(/tardó 12 min/i)).toBeInTheDocument();
  });

  it('listo sin fecha_listo (huérfano) se congela y dice tardó, no sigue en espera', async () => {
    const base = new Date('2026-10-26T10:00:00Z').toISOString();
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p-huerfano', mesa_numero: null, estado: 'listo', total: 48, fecha: base, fecha_listo: null },
    ]);
    mocks.mockVerPedido.mockResolvedValue({ id_pedido: 'p-huerfano', detalles: [] });
    renderCocina();
    expect(await screen.findByText(/tardó \d+ min/i)).toBeInTheDocument();
    expect(screen.queryByText(/min en espera/i)).not.toBeInTheDocument();
  });

  it('no llama a ventas ni muestra cobrar', async () => {
    renderCocina();
    await screen.findByRole('heading', { name: /^Cocina$/ });
    expect(screen.queryByRole('button', { name: /Cobrar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anular/i })).not.toBeInTheDocument();
  });

  it('muestra detalle de productos y tiempo en espera', async () => {
    renderCocina();
    expect(await screen.findAllByText(/Cono Triple/)).not.toHaveLength(0);
    expect(screen.getAllByText(/espera/i).length).toBeGreaterThan(0);
  });
});
