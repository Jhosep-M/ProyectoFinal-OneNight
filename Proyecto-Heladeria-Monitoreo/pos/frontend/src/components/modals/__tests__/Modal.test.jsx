import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Modal from '../Modal.jsx';

describe('Modal', () => {
  it('no renderiza cuando open=false', () => {
    render(<Modal open={false} title="T"><p>Contenido</p></Modal>);
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('renderiza cuando open=true', () => {
    render(<Modal open title="Título"><p>Contenido</p></Modal>);
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('role dialog y aria-modal', () => {
    render(<Modal open title="T"><p>x</p></Modal>);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('onClose con botón X', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T"><p>x</p></Modal>);
    await userEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onClose con backdrop', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T"><p>x</p></Modal>);
    await userEvent.click(document.querySelector('.modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra con click en contenido', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T"><p>Contenido</p></Modal>);
    await userEvent.click(screen.getByText('Contenido'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renderiza footer', () => {
    render(<Modal open title="T" footer={<button>OK</button>}><p>x</p></Modal>);
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });
});
