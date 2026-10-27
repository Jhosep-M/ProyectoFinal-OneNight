import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UserMenu from '../UserMenu.jsx';

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    session: { user: { email: 'maria@heladeria.com', user_metadata: { name: 'Maria' } } },
    signOut: vi.fn(),
    actualizarPassword: vi.fn(),
  }),
}));

vi.mock('../../../context/PermisosContext.jsx', () => ({
  usePermisos: () => ({ permisos: ['venta.consultar'], loading: false }),
}));

vi.mock('../../../hooks/useRol.js', () => ({
  useRol: () => ({ rol: 'cajero', loading: false }),
}));

function renderMenu() {
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>
  );
}

describe('UserMenu (avatar M universal)', () => {
  it('muestra trigger con iniciales sin necesidad de permiso', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /menú de usuario/i })).toBeInTheDocument();
  });

  it('abre menú con Mi perfil, Cambiar contraseña y Cerrar sesión', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /menú de usuario/i }));
    expect(screen.getByRole('menuitem', { name: /mi perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /cambiar contraseña/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('abre modal Mi perfil con rol', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /menú de usuario/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /mi perfil/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('maria@heladeria.com')).toBeInTheDocument();
  });

  it('valida contraseña corta sin llamar al backend', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /menú de usuario/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /cambiar contraseña/i }));
    await userEvent.type(screen.getByLabelText(/nueva contraseña/i), 'corta');
    await userEvent.type(screen.getByLabelText(/confirmar contraseña/i), 'corta');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument();
  });

  it('cierra menú con Escape', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /menú de usuario/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
