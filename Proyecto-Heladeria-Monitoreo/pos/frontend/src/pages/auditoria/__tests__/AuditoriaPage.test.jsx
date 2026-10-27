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
        { id_auditoria: 'a1', fecha: '2026-09-28T10:00:00Z', usuario_id: 'u1', usuario_nombre: 'Mollo Emersson', usuario_email: 'mollo@example.com', accion: 'venta.crear', entidad: 'venta', resultado: 'exito' },
        { id_auditoria: 'a2', fecha: '2026-09-28T11:00:00Z', usuario_id: null, accion: 'venta.crear', entidad: 'venta', resultado: 'exito' },
      ],
      total: 2,
    });
  });

  it('carga y muestra acciones', async () => {
    renderAuditoria();
    expect((await screen.findAllByText('venta.crear')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('exito')).length).toBeGreaterThan(0);
  });

  it('muestra total', async () => {
    renderAuditoria();
    expect(await screen.findByText('Acciones (2)')).toBeInTheDocument();
  });

  it('muestra nombre de usuario en vez de uuid', async () => {
    renderAuditoria();
    expect(await screen.findByText('Mollo Emersson')).toBeInTheDocument();
    expect(screen.queryByText('u1')).not.toBeInTheDocument();
  });

  it('muestra Sistema cuando no hay usuario', async () => {
    renderAuditoria();
    expect(await screen.findByText('Sistema')).toBeInTheDocument();
  });

  it('filtra por accion', async () => {
    renderAuditoria();
    await screen.findAllByText('venta.crear');
    await userEvent.type(screen.getByPlaceholderText('acción (ej. venta.crear)'), 'venta.crear');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => {
      expect(mocks.mockListarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'venta.crear' })
      );
    });
  });
});
