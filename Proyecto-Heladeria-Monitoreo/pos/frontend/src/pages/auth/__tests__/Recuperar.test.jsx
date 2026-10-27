import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import RecuperarPage from '../Recuperar.jsx';

const mocks = vi.hoisted(() => ({
  mockSolicitar: vi.fn(),
  mockVerificar: vi.fn(),
  mockActualizar: vi.fn(),
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    solicitarCodigo: mocks.mockSolicitar,
    verificarCodigo: mocks.mockVerificar,
    actualizarPassword: mocks.mockActualizar,
  }),
  AuthProvider: ({ children }) => children,
}));

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <RecuperarPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Recuperar con código (HU-24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSolicitar.mockResolvedValue({});
    mocks.mockVerificar.mockResolvedValue({});
    mocks.mockActualizar.mockResolvedValue({});
  });

  it('paso 1: solicita código con el email', async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'caja@heladeria.com');
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar código' }).closest('form'));
    await waitFor(() => {
      expect(mocks.mockSolicitar).toHaveBeenCalledWith('caja@heladeria.com');
    });
  });

  it('muestra mensaje genérico sin revelar si el email existe', async () => {
    mocks.mockSolicitar.mockRejectedValueOnce(new Error('User not found'));
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'nadie@x.com');
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar código' }).closest('form'));
    expect(await screen.findByText(/Si existe una cuenta/i)).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  it('paso 2 y 3: verifica código y guarda nueva contraseña', async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'caja@heladeria.com');
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar código' }).closest('form'));
    await screen.findByPlaceholderText('6 dígitos');
    await userEvent.type(screen.getByPlaceholderText('6 dígitos'), '123456');
    fireEvent.submit(screen.getByRole('button', { name: 'Verificar código' }).closest('form'));
    await waitFor(() => {
      expect(mocks.mockVerificar).toHaveBeenCalledWith('caja@heladeria.com', '123456');
    });
    await screen.findByPlaceholderText('mínimo 8 caracteres');
    await userEvent.type(screen.getByPlaceholderText('mínimo 8 caracteres'), 'NuevaClave123');
    await userEvent.type(screen.getByPlaceholderText('repite la contraseña'), 'NuevaClave123');
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar contraseña' }).closest('form'));
    await waitFor(() => {
      expect(mocks.mockActualizar).toHaveBeenCalledWith('NuevaClave123');
    });
  });
});
