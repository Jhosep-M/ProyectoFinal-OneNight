import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ConfirmEliminarModal from '../ConfirmEliminarModal.jsx';

describe('ConfirmEliminarModal', () => {
  it('muestra el nombre del cliente y confirma', async () => {
    const onConfirm = vi.fn().mockResolvedValue({});
    render(
      <ConfirmEliminarModal
        cliente={{ id_cliente: 'cl1', nombre: 'María', telefono: '71098016', correo: 'm@x.com' }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/María/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Inactivar' }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  it('cancelar llama onCancel y no confirma', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmEliminarModal
        cliente={{ id_cliente: 'cl1', nombre: 'María' }}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
