import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import DashboardPage from '../DashboardPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarTurnos: vi.fn(),
  mockListarVentas: vi.fn(),
  mockListarPedidos: vi.fn(),
}));

vi.mock('../../../services/cajaService.js', () => ({ listarTurnos: mocks.mockListarTurnos }));
vi.mock('../../../services/ventasService.js', () => ({ listarVentas: mocks.mockListarVentas }));
vi.mock('../../../services/pedidosService.js', () => ({ listarPedidos: mocks.mockListarPedidos }));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

function renderDashboard() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarTurnos.mockResolvedValue([
      { id_turno: 't1', fecha_apertura: '2026-09-28T08:00:00Z', monto_inicial: 100, estado: 'abierto' },
    ]);
    mocks.mockListarVentas.mockResolvedValue([
      { id_venta: 'v1', fecha: '2026-09-28T10:00:00Z', total: 150, estado: 'activa' },
    ]);
    mocks.mockListarPedidos.mockResolvedValue([
      { id_pedido: 'p1', mesa_id: 'mesa-1', estado: 'pendiente', total: 50 },
    ]);
  });

  it('muestra turno activo', async () => {
    renderDashboard();
    expect(await screen.findByText(/Turno abierto/)).toBeInTheDocument();
  });

  it('muestra ventas de hoy', async () => {
    renderDashboard();
    expect(await screen.findByText('150')).toBeInTheDocument();
  });

  it('muestra pedidos activos', async () => {
    renderDashboard();
    expect(await screen.findByText(/Pedidos activos/)).toBeInTheDocument();
    expect(screen.getByText('pendiente')).toBeInTheDocument();
  });

  it('muestra error cuando carga falla', async () => {
    mocks.mockListarTurnos.mockRejectedValueOnce(new Error('Error de red'));
    renderDashboard();
    expect(await screen.findByText(/Error de red/)).toBeInTheDocument();
  });
});
