import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const authState = vi.hoisted(() => ({ session: null, loading: false }));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    session: authState.session,
    loading: authState.loading,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

import RequireAuth from '../RequireAuth.jsx';

function renderGuard(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<p>Página login</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<p>Contenido privado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    authState.session = null;
    authState.loading = false;
  });

  it('redirige a /login cuando no hay sesión', () => {
    renderGuard();
    expect(screen.getByText('Página login')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('renderiza children cuando hay sesión', () => {
    authState.session = { user: { email: 'c@h.com' } };
    renderGuard();
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
    expect(screen.queryByText('Página login')).not.toBeInTheDocument();
  });

  it('muestra cargando mientras se resuelve la sesión', () => {
    authState.loading = true;
    renderGuard();
    expect(screen.getByText(/Cargando sesión/i)).toBeInTheDocument();
  });
});
