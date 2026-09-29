import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Input from '../Input.jsx';

describe('Input', () => {
  it('renderiza con label', () => {
    render(<Input label="Nombre" name="nombre" />);
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('onChange actualiza valor', async () => {
    render(<Input label="Email" name="email" />);
    const input = screen.getByLabelText('Email');
    await userEvent.type(input, 'a@b.com');
    expect(input).toHaveValue('a@b.com');
  });

  it('muestra error', () => {
    render(<Input label="Email" name="email" error="Email inválido" />);
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('disabled', () => {
    render(<Input label="Nombre" name="nombre" disabled />);
    expect(screen.getByLabelText('Nombre')).toBeDisabled();
  });

  it('sin label no renderiza label', () => {
    render(<Input name="sinlabel" />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });
});
