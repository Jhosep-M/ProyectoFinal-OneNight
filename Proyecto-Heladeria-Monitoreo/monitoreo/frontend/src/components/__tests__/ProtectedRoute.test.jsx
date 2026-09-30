import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute.jsx';

const authState = vi.hoisted(() => ({ sesion: null, cargando: false }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    sesion: authState.sesion,
    cargando: authState.cargando,
  }),
}));

function renderGuard(initialPath = '/consumo') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<p>Página login</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/consumo" element={<p>Contenido privado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authState.sesion = null;
    authState.cargando = false;
  });

  it('redirige a /login cuando no hay sesión', () => {
    renderGuard();
    expect(screen.getByText('Página login')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('renderiza el contenido cuando hay sesión', () => {
    authState.sesion = { user: { email: 'op@planta.bo' } };
    renderGuard();
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });
});
