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
  mockEliminar: vi.fn(),
}));

vi.mock('../../../services/customersService.js', () => ({
  listarClientes: mocks.mockListar,
  verCliente: mocks.mockVer,
  crearCliente: mocks.mockCrear,
  actualizarCliente: mocks.mockActualizar,
  eliminarCliente: mocks.mockEliminar,
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
      { id_cliente: 'cl1', nombre: 'María', telefono: '555', correo: 'maria@x.com', carnet_identidad: '1234567 LP', puntos_fidelidad: 120, estado: 'activo' },
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
    await userEvent.type(screen.getByPlaceholderText('Ej. 71098016'), '71098016');
    await userEvent.type(screen.getByPlaceholderText('cliente@correo.com'), 'pedro@x.com');
    await userEvent.type(screen.getByPlaceholderText('Ej. 1234567-1A LP'), '7654321 SC');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Pedro', telefono: '71098016', correo: 'pedro@x.com', carnet_identidad: '7654321 SC' }));
    });
  });

  it('muestra empty-state cuando no hay clientes', async () => {
    mocks.mockListar.mockResolvedValue([]);
    renderClientes();
    expect(await screen.findByText('Sin clientes')).toBeInTheDocument();
  });

  it('crear NO envía puntos_fidelidad', async () => {
    mocks.mockCrear.mockResolvedValue({ id_cliente: 'cl2' });
    renderClientes();
    await screen.findByText('María');
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Pedro');
    await userEvent.type(screen.getByPlaceholderText('Ej. 71098016'), '71098016');
    await userEvent.type(screen.getByPlaceholderText('cliente@correo.com'), 'pedro@x.com');
    await userEvent.type(screen.getByPlaceholderText('Ej. 1234567-1A LP'), '7654321 SC');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalled();
    });
    const payload = mocks.mockCrear.mock.calls[0][0];
    expect(payload).not.toHaveProperty('puntos_fidelidad');
  });

  it('eliminar abre modal y confirma con el servicio', async () => {
    mocks.mockEliminar.mockResolvedValue({ ok: true, eliminado: 'cl1' });
    renderClientes();
    await screen.findByText('María');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    const botones = screen.getAllByRole('button', { name: 'Eliminar' });
    await userEvent.click(botones[botones.length - 1]);
    await waitFor(() => {
      expect(mocks.mockEliminar).toHaveBeenCalledWith('cl1');
    });
  });

  it('eliminar se puede cancelar sin llamar al servicio', async () => {
    renderClientes();
    await screen.findByText('María');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(mocks.mockEliminar).not.toHaveBeenCalled();
  });

  it('bloquea crear con correo duplicado sin llamar al servicio', async () => {
    renderClientes();
    await screen.findByText('María');
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Otro');
    await userEvent.type(screen.getByPlaceholderText('Ej. 71098016'), '72000001');
    await userEvent.type(screen.getByPlaceholderText('cliente@correo.com'), 'MARIA@x.com');
    await userEvent.type(screen.getByPlaceholderText('Ej. 1234567-1A LP'), '9999999 LP');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).not.toHaveBeenCalled();
    });
    expect(await screen.findByText(/Correo ya registrado/)).toBeInTheDocument();
  });

  it('bloquea crear con telefono duplicado sin llamar al servicio', async () => {
    mocks.mockListar.mockResolvedValue([
      { id_cliente: 'cl1', nombre: 'María', telefono: '71098016', correo: 'maria@x.com', carnet_identidad: '1234567 LP', puntos_fidelidad: 120, estado: 'activo' },
    ]);
    renderClientes();
    await screen.findByText('María');
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Otro');
    await userEvent.type(screen.getByPlaceholderText('Ej. 71098016'), '71098016');
    await userEvent.type(screen.getByPlaceholderText('cliente@correo.com'), 'otro@x.com');
    await userEvent.type(screen.getByPlaceholderText('Ej. 1234567-1A LP'), '9999999 LP');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).not.toHaveBeenCalled();
    });
    expect(await screen.findByText(/Teléfono ya registrado/)).toBeInTheDocument();
  });

  it('columna Puntos centrada con tabular-nums', async () => {
    renderClientes();
    await screen.findByText('María');
    const th = screen.getByText('Puntos');
    expect(th.className).toMatch(/numeric--center/);
  });

  it('bloquea crear con carnet inválido sin llamar al servicio', async () => {
    mocks.mockCrear.mockClear();
    renderClientes();
    await screen.findByText('María');
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Otro');
    await userEvent.type(screen.getByPlaceholderText('Ej. 71098016'), '72000001');
    await userEvent.type(screen.getByPlaceholderText('cliente@correo.com'), 'otro@x.com');
    await userEvent.type(screen.getByPlaceholderText('Ej. 1234567-1A LP'), 'ABC');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).not.toHaveBeenCalled();
    });
    expect(await screen.findByText(/Carnet inválido/)).toBeInTheDocument();
  });

  it('bloquea crear con carnet duplicado sin llamar al servicio', async () => {
    renderClientes();
    await screen.findByText('María');
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Otro');
    await userEvent.type(screen.getByPlaceholderText('Ej. 71098016'), '72000001');
    await userEvent.type(screen.getByPlaceholderText('cliente@correo.com'), 'otro@x.com');
    await userEvent.type(screen.getByPlaceholderText('Ej. 1234567-1A LP'), '1234567 LP');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).not.toHaveBeenCalled();
    });
    expect(await screen.findByText(/Carnet ya registrado/)).toBeInTheDocument();
  });
});
