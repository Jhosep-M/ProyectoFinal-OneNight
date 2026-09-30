import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Alert from '../Alert.jsx';

describe('Alert', () => {
  it('renderiza message', () => {
    render(<Alert tone="success" message="Guardado" />);
    expect(screen.getByText('Guardado')).toBeInTheDocument();
  });

  it('renderiza title y children', () => {
    render(<Alert tone="error" title="Error"><p>Algo falló</p></Alert>);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Algo falló')).toBeInTheDocument();
  });

  it('tono success', () => {
    render(<Alert tone="success" message="ok" />);
    expect(document.querySelector('.alert-success')).toBeInTheDocument();
  });

  it('tono error', () => {
    render(<Alert tone="error" message="mal" />);
    expect(document.querySelector('.alert-error')).toBeInTheDocument();
  });

  it('onClose se ejecuta', async () => {
    const onClose = vi.fn();
    render(<Alert tone="info" message="info" onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sin onClose no renderiza botón cerrar', () => {
    render(<Alert tone="info" message="info" />);
    expect(screen.queryByLabelText('Cerrar')).not.toBeInTheDocument();
  });
});
