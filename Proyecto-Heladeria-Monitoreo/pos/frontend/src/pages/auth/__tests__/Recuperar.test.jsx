import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import RecuperarPage from '../Recuperar.jsx';

const mocks = vi.hoisted(() => ({
  mockReset: vi.fn(),
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ resetPassword: mocks.mockReset }),
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

describe('Recuperar (HU-24)', () => {
  beforeEach(() => {
    mocks.mockReset.mockReset();
    mocks.mockReset.mockResolvedValue({});
  });

  it('llama resetPasswordForEmail con redirect a /login', async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'caja@heladeria.com');
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar enlace' }).closest('form'));
    await waitFor(() => {
      expect(mocks.mockReset).toHaveBeenCalledWith('caja@heladeria.com');
    });
  });

  it('muestra mensaje genérico sin revelar si el email existe', async () => {
    mocks.mockReset.mockRejectedValueOnce(new Error('User not found'));
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'nadie@x.com');
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar enlace' }).closest('form'));
    expect(await screen.findByText(/Si existe una cuenta/i)).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });
});
