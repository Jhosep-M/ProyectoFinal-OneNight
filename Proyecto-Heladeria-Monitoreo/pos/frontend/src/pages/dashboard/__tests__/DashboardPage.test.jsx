import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import DashboardPage from '../DashboardPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarVentas: vi.fn(),
  mockListarMesas: vi.fn(),
}));

vi.mock('../../../services/ventasService.js', () => ({ listarVentas: mocks.mockListarVentas }));
vi.mock('../../../services/mesasService.js', () => ({
  listarMesas: mocks.mockListarMesas,
  verMesa: vi.fn(),
  crearMesa: vi.fn(),
  actualizarMesa: vi.fn(),
}));

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
    mocks.mockListarVentas.mockResolvedValue([
      { id_venta: 'v1', fecha: '2026-09-28T10:00:00Z', total: 150, estado: 'activa' },
    ]);
    mocks.mockListarMesas.mockResolvedValue([
      { id_mesa: 'm1', numero: 1, estado: 'ocupada' },
      { id_mesa: 'm2', numero: 2, estado: 'libre' },
    ]);
  });

  it('muestra métricas del día', async () => {
    renderDashboard();
    expect(await screen.findByText('Ventas del día')).toBeInTheDocument();
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Mesas ocupadas')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('muestra pedidos recientes', async () => {
    renderDashboard();
    expect(await screen.findByText('Pedidos recientes')).toBeInTheDocument();
    expect(screen.getByText('1 pedidos')).toBeInTheDocument();
  });

  it('muestra vacío cuando no hay ventas', async () => {
    mocks.mockListarVentas.mockResolvedValue([]);
    mocks.mockListarMesas.mockResolvedValue([]);
    renderDashboard();
    expect(await screen.findByText('No hay pedidos registrados')).toBeInTheDocument();
  });

  it('muestra error cuando carga falla', async () => {
    mocks.mockListarVentas.mockRejectedValueOnce(new Error('Error de red'));
    renderDashboard();
    expect(await screen.findByText(/No se pudieron cargar los datos/)).toBeInTheDocument();
  });
});
