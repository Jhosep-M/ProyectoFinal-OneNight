import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext.jsx';

export function renderWithAuth(ui, { session = { user: { email: 'caja@heladeria.com' } } } = {}) {
  return render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>
  );
}

export function mockFetchOnce(data) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

export function mockFetchError(status = 500, message = 'Error') {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: false,
    text: () => Promise.resolve(JSON.stringify({ error: message })),
  });
}
