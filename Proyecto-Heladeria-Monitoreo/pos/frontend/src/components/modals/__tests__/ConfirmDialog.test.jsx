import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from '../ConfirmDialog.jsx';

describe('ConfirmDialog', () => {
  it('renderiza title y message', () => {
    render(<ConfirmDialog open title="Eliminar" message="¿Seguro?" />);
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
    expect(screen.getByText('¿Seguro?')).toBeInTheDocument();
  });

  it('onConfirm se ejecuta', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="T" message="m" onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('onClose con Cancelar', async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog open title="T" message="m" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('variante danger', () => {
    render(<ConfirmDialog open title="T" message="m" danger />);
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveClass('btn-danger');
  });

  it('confirmText custom', () => {
    render(<ConfirmDialog open title="T" message="m" confirmText="Eliminar" />);
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });
});
