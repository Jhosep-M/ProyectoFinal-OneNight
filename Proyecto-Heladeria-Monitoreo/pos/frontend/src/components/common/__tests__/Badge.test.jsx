import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Badge from '../Badge.jsx';

describe('Badge', () => {
  it('renderiza children', () => {
    <Badge>activo</Badge>;
    render(<Badge>activo</Badge>);
    expect(screen.getByText('activo')).toBeInTheDocument();
  });

  it('tono neutral por defecto', () => {
    render(<Badge>x</Badge>);
    expect(screen.getByText('x')).toHaveClass('badge-neutral');
  });

  it('tono success', () => {
    render(<Badge tone="success">ok</Badge>);
    expect(screen.getByText('ok')).toHaveClass('badge-success');
  });

  it('tono error', () => {
    render(<Badge tone="error">falló</Badge>);
    expect(screen.getByText('falló')).toHaveClass('badge-error');
  });

  it('tono warning', () => {
    render(<Badge tone="warning">pendiente</Badge>);
    expect(screen.getByText('pendiente')).toHaveClass('badge-warning');
  });

  it('tono info', () => {
    render(<Badge tone="info">info</Badge>);
    expect(screen.getByText('info')).toHaveClass('badge-info');
  });

  it('tono accent', () => {
    render(<Badge tone="accent">turno</Badge>);
    expect(screen.getByText('turno')).toHaveClass('badge-accent');
  });
});
