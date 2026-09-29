import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmptyState from '../EmptyState.jsx';

describe('EmptyState', () => {
  it('renderiza title', () => {
    render(<EmptyState title="Sin datos" />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('renderiza description', () => {
    render(<EmptyState title="Sin datos" description="Aún no hay registros" />);
    expect(screen.getByText('Aún no hay registros')).toBeInTheDocument();
  });

  it('renderiza action', () => {
    render(<EmptyState title="Sin datos" action={<button>Crear</button>} />);
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
  });
});
