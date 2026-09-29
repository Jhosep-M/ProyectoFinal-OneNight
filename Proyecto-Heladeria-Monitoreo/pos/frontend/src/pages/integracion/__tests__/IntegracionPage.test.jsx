import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import IntegracionPage from '../IntegracionPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarCola: vi.fn(),
  mockReintentar: vi.fn(),
}));

vi.mock('../../../services/integracionService.js', () => ({
  listarCola: mocks.mockListarCola,
  reintentarCola: mocks.mockReintentar,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

function renderIntegracion() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <IntegracionPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('IntegracionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarCola.mockResolvedValue({
      data: [
        { id_cola: 'c1', tipo_recurso: 'agua', cantidad: 125, unidad_medida: 'litros', estado: 'pendiente', intentos: 0, proximo_intento: null },
      ],
      total: 1,
    });
  });

  it('carga y muestra cola', async () => {
    renderIntegracion();
    expect(await screen.findByText('agua')).toBeInTheDocument();
    expect(document.querySelector('.badge-warning')).toHaveTextContent('pendiente');
  });

  it('muestra total', async () => {
    renderIntegracion();
    expect(await screen.findByText('Total: 1')).toBeInTheDocument();
  });

  it('reintentar llama al servicio', async () => {
    mocks.mockReintentar.mockResolvedValue({});
    renderIntegracion();
    await screen.findByText('agua');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => {
      expect(mocks.mockReintentar).toHaveBeenCalledWith('c1');
    });
  });

  it('filtra por estado', async () => {
    renderIntegracion();
    await screen.findByText('agua');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'enviado');
    await waitFor(() => {
      expect(mocks.mockListarCola).toHaveBeenCalledWith(expect.objectContaining({ estado: 'enviado' }));
    });
  });
});
