import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import AuditoriaPage from '../AuditoriaPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListarAuditoria: vi.fn(),
}));

vi.mock('../../../services/auditService.js', () => ({
  listarAuditoria: mocks.mockListarAuditoria,
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

function renderAuditoria() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <AuditoriaPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('AuditoriaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListarAuditoria.mockResolvedValue({
      data: [
        { id_auditoria: 'a1', fecha: '2026-09-28T10:00:00Z', usuario_id: 'u1', accion: 'venta.crear', entidad: 'venta', resultado: 'exito' },
      ],
      total: 1,
    });
  });

  it('carga y muestra acciones', async () => {
    renderAuditoria();
    expect(await screen.findByText('venta.crear')).toBeInTheDocument();
    expect(screen.getByText('exito')).toBeInTheDocument();
  });

  it('muestra total', async () => {
    renderAuditoria();
    expect(await screen.findByText('Acciones (1)')).toBeInTheDocument();
  });

  it('filtra por accion', async () => {
    renderAuditoria();
    await screen.findByText('venta.crear');
    await userEvent.type(screen.getByPlaceholderText('acción (ej. venta.crear)'), 'venta.crear');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => {
      expect(mocks.mockListarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'venta.crear' })
      );
    });
  });
});
