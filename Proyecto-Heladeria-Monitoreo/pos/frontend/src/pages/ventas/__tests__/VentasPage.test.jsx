import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import VentasPage from '../VentasPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarVentas: vi.fn(),
  mockListarMetodos: vi.fn(),
  mockCrearVenta: vi.fn(),
  mockAnularVenta: vi.fn(),
  mockCrearDevolucion: vi.fn(),
}));

vi.mock('../../../services/ventasService.js', () => ({
  listarVentas: mocks.mockListarVentas,
  listarMetodosPago: mocks.mockListarMetodos,
  crearVenta: mocks.mockCrearVenta,
  anularVenta: mocks.mockAnularVenta,
  crearDevolucion: mocks.mockCrearDevolucion,
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
    mocks.mockListarVentas.mockResolvedValue([
      { id_venta: 'v1', fecha: '2026-09-28T10:00:00Z', total: 150, estado: 'activa' },
    ]);
    mocks.mockListarMetodos.mockResolvedValue([
      { id_metodo_pago: 'm1', nombre: 'Efectivo' },
    ]);
  });

  it('carga y muestra ventas', async () => {
    renderVentas();
    expect(await screen.findByText('150')).toBeInTheDocument();
  });

  it('muestra badge de estado activa', async () => {
    renderVentas();
    expect(await screen.findByText('activa')).toBeInTheDocument();
  });

  it('crear venta llama al servicio', async () => {
    mocks.mockCrearVenta.mockResolvedValue({ venta_id: 'v2' });
    renderVentas();
    await screen.findByText('150');
    await userEvent.type(screen.getByPlaceholderText('turno_id'), 'turno-123');
    await userEvent.type(screen.getAllByPlaceholderText('producto_id')[0], 'prod-1');
    await userEvent.type(screen.getByPlaceholderText('monto'), '100');
    const form = screen.getByRole('button', { name: 'Cobrar' }).closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mocks.mockCrearVenta).toHaveBeenCalledWith(
        expect.objectContaining({ turno_id: 'turno-123' })
      );
    });
  });

  it('muestra error cuando cargar falla', async () => {
    mocks.mockListarVentas.mockRejectedValueOnce(new Error('Sin conexión'));
    renderVentas();
    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument();
  });
});
