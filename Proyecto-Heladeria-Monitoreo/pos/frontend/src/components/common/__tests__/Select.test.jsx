import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import Select from '../Select.jsx';

describe('Select', () => {
  it('renderiza opciones', () => {
    render(
      <Select label="Estado" name="estado">
        <option value="activo">activo</option>
        <option value="inactivo">inactivo</option>
      </Select>
    );
    expect(screen.getByLabelText('Estado')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'activo' })).toBeInTheDocument();
  });

  it('onChange selecciona valor', async () => {
    render(
      <Select label="Estado" name="estado" defaultValue="activo">
        <option value="activo">activo</option>
        <option value="inactivo">inactivo</option>
      </Select>
    );
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'inactivo');
    expect(screen.getByLabelText('Estado')).toHaveValue('inactivo');
  });

  it('muestra error', () => {
    render(
      <Select label="Estado" name="estado" error="Requerido">
        <option value="">elija…</option>
      </Select>
    );
    expect(screen.getByText('Requerido')).toBeInTheDocument();
  });
});
