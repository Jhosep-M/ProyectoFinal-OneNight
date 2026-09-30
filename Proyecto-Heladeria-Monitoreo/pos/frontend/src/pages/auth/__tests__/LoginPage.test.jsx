import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import LoginPage from '../LoginPage.jsx';

const mocks = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signIn: mocks.mockSignIn, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    mocks.mockSignIn.mockReset();
    mocks.mockSignIn.mockResolvedValue({});
  });

  it('renderiza formulario', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('submit llama signIn con credenciales', async () => {
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'caja@heladeria.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'secreto');
    const form = screen.getByRole('button', { name: 'Ingresar' }).closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mocks.mockSignIn).toHaveBeenCalledWith('caja@heladeria.com', 'secreto');
    });
  });

  it('muestra error cuando signIn falla', async () => {
    mocks.mockSignIn.mockRejectedValueOnce(new Error('Credenciales inválidas'));
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'mala');
    const form = screen.getByRole('button', { name: 'Ingresar' }).closest('form');
    fireEvent.submit(form);
    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
  });
});
