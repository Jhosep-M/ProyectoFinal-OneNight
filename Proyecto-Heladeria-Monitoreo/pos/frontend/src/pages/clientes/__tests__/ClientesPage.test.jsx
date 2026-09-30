import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import ClientesPage from '../ClientesPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockVer: vi.fn(),
  mockCrear: vi.fn(),
  mockActualizar: vi.fn(),
}));

vi.mock('../../../services/customersService.js', () => ({
  listarClientes: mocks.mockListar,
  verCliente: mocks.mockVer,
  crearCliente: mocks.mockCrear,
  actualizarCliente: mocks.mockActualizar,
  ajustarPuntos: vi.fn(),
  verVentasCliente: vi.fn(),
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));
vi.mock('../../../context/PermisosContext.jsx', () => ({ usePermisos: () => ({ permisos: ['*'], loading: false, tienePermiso: () => true, recargar: vi.fn() }), PermisosProvider: ({ children }) => children }));

function renderClientes() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <ClientesPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('ClientesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListar.mockResolvedValue([
      { id_cliente: 'cl1', nombre: 'María', telefono: '555', correo: 'maria@x.com', puntos_fidelidad: 120, estado: 'activo' },
    ]);
  });

  it('carga y muestra clientes', async () => {
    renderClientes();
    expect(await screen.findByText('María')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('ver detalle muestra movimientos', async () => {
    mocks.mockVer.mockResolvedValue({
      id_cliente: 'cl1', nombre: 'María', puntos_fidelidad: 120,
      movimientos_puntos: [{ id_movimiento: 'mp1', fecha: '2026-09-28T10:00:00Z', tipo: 'acumulo', puntos: 10, motivo: 'Venta' }],
    });
    renderClientes();
    await screen.findByText('María');
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(await screen.findByText('acumulo')).toBeInTheDocument();
  });

  it('crear cliente llama al servicio', async () => {
    mocks.mockCrear.mockResolvedValue({ id_cliente: 'cl2' });
    renderClientes();
    await screen.findByText('María');
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Pedro');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Pedro' }));
    });
  });

  it('muestra empty-state cuando no hay clientes', async () => {
    mocks.mockListar.mockResolvedValue([]);
    renderClientes();
    expect(await screen.findByText('Sin clientes — crea el primero')).toBeInTheDocument();
  });

  it('crear NO envía puntos_fidelidad', async () => {
    mocks.mockCrear.mockResolvedValue({ id_cliente: 'cl2' });
    renderClientes();
    await screen.findByText('María');
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Pedro');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalled();
    });
    const payload = mocks.mockCrear.mock.calls[0][0];
    expect(payload).not.toHaveProperty('puntos_fidelidad');
    expect(payload).toEqual(expect.objectContaining({ nombre: 'Pedro' }));
  });
});
