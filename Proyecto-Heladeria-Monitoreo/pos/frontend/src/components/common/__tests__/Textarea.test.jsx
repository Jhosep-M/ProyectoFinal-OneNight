import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import Textarea from '../Textarea.jsx';

describe('Textarea', () => {
  it('renderiza con label', () => {
    render(<Textarea label="Motivo" name="motivo" />);
    expect(screen.getByLabelText('Motivo')).toBeInTheDocument();
  });

  it('onChange actualiza valor', async () => {
    render(<Textarea label="Motivo" name="motivo" />);
    const ta = screen.getByLabelText('Motivo');
    await userEvent.type(ta, 'devolución');
    expect(ta).toHaveValue('devolución');
  });

  it('rows custom', () => {
    render(<Textarea label="Motivo" name="motivo" rows={5} />);
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('rows', '5');
  });
});
