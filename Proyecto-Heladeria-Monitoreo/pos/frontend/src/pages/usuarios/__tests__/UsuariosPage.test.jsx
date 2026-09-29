import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import UsuariosPage from '../UsuariosPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockCrear: vi.fn(),
  mockActualizar: vi.fn(),
}));

vi.mock('../../../services/usersService.js', () => ({
  listarUsuarios: mocks.mockListar,
  crearUsuario: mocks.mockCrear,
  actualizarUsuario: mocks.mockActualizar,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

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
      { id_usuario: 'u1', nombre: 'Ana', email: 'ana@heladeria.com', rol_id: null, estado: 'activo' },
    ]);
  });

  it('carga y muestra usuarios', async () => {
    renderUsuarios();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('ana@heladeria.com')).toBeInTheDocument();
  });

  it('crear usuario llama al servicio', async () => {
    mocks.mockCrear.mockResolvedValue({ id_usuario: 'u2' });
    renderUsuarios();
    await screen.findByText('Ana');
    await userEvent.type(screen.getByPlaceholderText('nombre'), 'Luis');
    await userEvent.type(screen.getByPlaceholderText('email'), 'luis@heladeria.com');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Luis', email: 'luis@heladeria.com' })
      );
    });
  });

  it('editar carga datos al formulario', async () => {
    renderUsuarios();
    await screen.findByText('Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
  });
});
