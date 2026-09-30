import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Button from '../Button.jsx';

describe('Button', () => {
  it('renderiza children', () => {
    render(<Button>Cobrar</Button>);
    expect(screen.getByRole('button', { name: 'Cobrar' })).toBeInTheDocument();
  });

  it('variante primary por defecto', () => {
    render(<Button>OK</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('variante danger', () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('variante secondary', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });

  it('variante ghost', () => {
    render(<Button variant="ghost">Volver</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost');
  });

  it('size sm', () => {
    render(<Button size="sm">Pequeño</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-sm');
  });

  it('disabled', () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('loading muestra spinner y deshabilita', () => {
    render(<Button loading>Guardando</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(document.querySelector('.btn-spinner')).toBeInTheDocument();
  });

  it('onClick se ejecuta', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('onClick no se ejecuta cuando está disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
