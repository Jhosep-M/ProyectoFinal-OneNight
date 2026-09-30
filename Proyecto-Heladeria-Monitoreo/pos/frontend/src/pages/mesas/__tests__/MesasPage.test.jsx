import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import MesasPage from '../MesasPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockVer: vi.fn(),
  mockCrear: vi.fn(),
  mockActualizar: vi.fn(),
}));

vi.mock('../../../services/mesasService.js', () => ({
  listarMesas: mocks.mockListar,
  verMesa: mocks.mockVer,
  crearMesa: mocks.mockCrear,
  actualizarMesa: mocks.mockActualizar,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

const mockSetHeader = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useOutletContext: () => ({ setHeaderOverride: mockSetHeader }) };
});

function renderMesas() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <MesasPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('MesasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListar.mockResolvedValue([
      { id_mesa: 'm1', numero: 1, estado: 'libre', pedidos_abiertos: 0 },
      { id_mesa: 'm2', numero: 2, estado: 'ocupada', pedidos_abiertos: 1 },
    ]);
    mocks.mockVer.mockImplementation(async (id) =>
      ({ id_mesa: id, numero: id === 'm1' ? 1 : 2, estado: id === 'm1' ? 'libre' : 'ocupada', pedidos_abiertos: id === 'm1' ? 0 : 1, pedidos: id === 'm2' ? [{ id_pedido: 'p1', estado: 'abierto', mesero_nombre: 'Ana' }] : [] })
    );
  });

  it('carga y muestra mesas', async () => {
    renderMesas();
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('Libre').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ocupada').length).toBeGreaterThan(0);
  });

  it('filtros muestran conteos y mostrador operativo', async () => {
    renderMesas();
    await screen.findByText('1');
    expect(screen.getByRole('button', { name: /Todas \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Libre \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ocupada \(1\)/ })).toBeInTheDocument();
    expect(screen.queryByText(/0\/0 personas/)).not.toBeInTheDocument();
    expect(screen.getByText(/Sin pedidos abiertos/)).toBeInTheDocument();
    expect(screen.getByText(/1 pedido\(s\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/Sin cuenta/).length).toBeGreaterThan(0);
  });

  it('panel muestra cuenta, mesero y acciones operativas', async () => {
    mocks.mockVer.mockResolvedValueOnce({
      id_mesa: 'm2', numero: 2, estado: 'ocupada', pedidos_abiertos: 1,
      cuenta_total: 68.5, mesero_nombre: 'Ana', abierto_desde: new Date().toISOString(),
      pedidos: [{ id_pedido: 'p1', estado: 'abierto', mesero_nombre: 'Ana', total: 68.5 }],
    });
    renderMesas();
    await screen.findByText('1');
    await userEvent.click(screen.getByText('2'));
    expect(await screen.findByText(/Cuenta actual/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo pedido/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver cuenta/ })).toBeInTheDocument();
  });

  it('publica header dinámico 1/2 mesas ocupadas', async () => {
    renderMesas();
    await screen.findByText('1');
    await waitFor(() => {
      expect(mockSetHeader).toHaveBeenCalledWith({ breadcrumb: '1/2 mesas ocupadas' });
    });
  });

  it('crear mesa llama al servicio con el siguiente número', async () => {
    mocks.mockCrear.mockResolvedValue({ id_mesa: 'm3', numero: 3, estado: 'libre' });
    renderMesas();
    await screen.findByText('1');
    await userEvent.click(screen.getByRole('button', { name: /Nueva Mesa/ }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith(3);
    });
  });

  it('liberar mesa llama al servicio', async () => {
    mocks.mockActualizar.mockResolvedValue({ id_mesa: 'm2', numero: 2, estado: 'libre' });
    renderMesas();
    await screen.findByText('2');
    await userEvent.click(screen.getByText('2'));
    await userEvent.click(await screen.findByRole('button', { name: /^Liberar$/ }));
    await waitFor(() => {
      expect(mocks.mockActualizar).toHaveBeenCalledWith('m2', { estado: 'libre' });
    });
  });
});
