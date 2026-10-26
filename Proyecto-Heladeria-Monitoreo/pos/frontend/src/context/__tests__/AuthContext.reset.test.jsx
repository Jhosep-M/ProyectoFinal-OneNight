import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockResetForEmail: vi.fn(() => Promise.resolve({})),
  mockGetSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
}));

vi.mock('../../services/api.js', () => ({
  supabase: {
    auth: {
      getSession: mocks.mockGetSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(() => Promise.resolve({})),
      resetPasswordForEmail: mocks.mockResetForEmail,
    },
  },
  BASE: 'http://localhost:3000/api/v1',
  apiFetch: vi.fn(),
}));

import { AuthProvider, useAuth } from '../AuthContext.jsx';

describe('AuthContext resetPassword (HU-24)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa resetPasswordForEmail con redirect a /login', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });
    await act(async () => {
      await result.current.resetPassword('caja@heladeria.com');
    });
    expect(mocks.mockResetForEmail).toHaveBeenCalledWith(
      'caja@heladeria.com',
      expect.objectContaining({ redirectTo: expect.stringMatching(/\/login$/) })
    );
  });
});
