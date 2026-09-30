import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from '../Card.jsx';

describe('Card', () => {
  it('renderiza children', () => {
    <Card><p>Contenido</p></Card>;
    render(<Card><p>Contenido</p></Card>);
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('renderiza title', () => {
    render(<Card title="Mi título"><p>x</p></Card>);
    expect(screen.getByText('Mi título')).toBeInTheDocument();
  });

  it('renderiza actions', () => {
    render(<Card title="T" actions={<button>Acción</button>}><p>x</p></Card>);
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });

  it('sin title ni actions no renderiza header', () => {
    render(<Card><p>x</p></Card>);
    expect(document.querySelector('.card-header')).not.toBeInTheDocument();
  });
});
