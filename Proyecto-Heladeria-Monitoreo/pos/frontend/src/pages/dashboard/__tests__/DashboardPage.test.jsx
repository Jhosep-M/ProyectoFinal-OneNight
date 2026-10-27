import { render, screen, waitFor } from '@testing-library/react';
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
    // Error global solo si AMBAS fuentes críticas fallan (tolerante a 429 parcial).
    mocks.mockListarVentas.mockRejectedValueOnce(new Error('Error de red'));
    mocks.mockListarMesas.mockRejectedValueOnce(new Error('Error de red'));
    renderDashboard();
    expect(await screen.findByText(/No se pudieron cargar los datos/)).toBeInTheDocument();
  });

  it('muestra datos parciales si solo una fuente falla (tolerante a 429)', async () => {
    mocks.mockListarVentas.mockRejectedValueOnce(new Error('429'));
    // mesas resuelve desde beforeEach -> no debe mostrar error global
    renderDashboard();
    expect(await screen.findByText('Ventas del día')).toBeInTheDocument();
  });

  it('recarga al recuperar foco (refresco tras cobrar)', async () => {
    renderDashboard();
    await screen.findByText('Ventas del día');
    await waitFor(() => expect(mocks.mockListarVentas).toHaveBeenCalledTimes(1));

    mocks.mockListarVentas.mockResolvedValue([
      { id_venta: 'v2', fecha: '2026-09-28T11:00:00Z', total: 999, estado: 'activa' },
    ]);
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(mocks.mockListarVentas).toHaveBeenCalledTimes(2));
  });
});
