import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import UsuariosPage from '../UsuariosPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockRoles: vi.fn(),
  mockCrear: vi.fn(),
  mockActualizar: vi.fn(),
  mockEliminar: vi.fn(),
}));

vi.mock('../../../services/usersService.js', () => ({
  listarUsuarios: mocks.mockListar,
  listarRoles: mocks.mockRoles,
  crearUsuario: mocks.mockCrear,
  actualizarUsuario: mocks.mockActualizar,
  eliminarUsuario: mocks.mockEliminar,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

vi.mock('../../../hooks/useAutoRefresh.js', () => ({ useAutoRefresh: vi.fn() }));

function renderUsuarios() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('UsuariosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListar.mockResolvedValue([
      { id_usuario: 'u1', nombre: 'Ana', email: 'ana@heladeria.com', rol_id: 'r1', rol: 'cajero' },
    ]);
    mocks.mockRoles.mockResolvedValue([
      { id_rol: 'r1', nombre: 'cajero' },
      { id_rol: 'r2', nombre: 'admin' },
    ]);
  });

  it('carga y muestra usuarios sin columna Estado', async () => {
    renderUsuarios();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('ana@heladeria.com')).toBeInTheDocument();
    expect(screen.queryByText('Estado')).not.toBeInTheDocument();
    expect(screen.queryByText('ACTIVO')).not.toBeInTheDocument();
  });

  it('crear usuario exige rol y contraseña', async () => {
    mocks.mockCrear.mockResolvedValue({ id_usuario: 'u2' });
    renderUsuarios();
    await screen.findByText('Ana');
    await userEvent.type(screen.getByPlaceholderText('nombre'), 'Luis');
    await userEvent.type(screen.getByPlaceholderText('email'), 'luis@heladeria.com');
    await userEvent.type(screen.getByPlaceholderText(/contraseña/i), 'Secreta123');
    // selecciona rol cajero
    await userEvent.selectOptions(screen.getByRole('combobox'), 'cajero');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Luis', email: 'luis@heladeria.com', password: 'Secreta123', rol: 'cajero' })
      );
    });
  });

  it('editar carga datos al formulario', async () => {
    renderUsuarios();
    await screen.findByText('Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
  });

  it('eliminar pide confirmación y llama al servicio', async () => {
    mocks.mockEliminar.mockResolvedValue({ ok: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderUsuarios();
    await screen.findByText('Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => {
      expect(mocks.mockEliminar).toHaveBeenCalledWith('u1');
    });
    confirmSpy.mockRestore();
  });
});
