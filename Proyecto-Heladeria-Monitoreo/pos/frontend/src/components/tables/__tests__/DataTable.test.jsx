import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import DataTable from '../DataTable.jsx';

const columns = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'total', label: 'Total' },
];

const rows = [
  { id: 1, nombre: 'Venta A', total: 100 },
  { id: 2, nombre: 'Venta B', total: 200 },
];

describe('DataTable', () => {
  it('renderiza filas', () => {
    render(<DataTable columns={columns} rows={rows} rowKey="id" />);
    expect(screen.getByText('Venta A')).toBeInTheDocument();
    expect(screen.getByText('Venta B')).toBeInTheDocument();
  });

  it('renderiza headers', () => {
    render(<DataTable columns={columns} rows={rows} rowKey="id" />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('loading muestra skeleton', () => {
    render(<DataTable columns={columns} rows={rows} loading rowKey="id" />);
    expect(document.querySelector('.skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Venta A')).not.toBeInTheDocument();
  });

  it('empty state cuando no hay filas', () => {
    render(<DataTable columns={columns} rows={[]} emptyTitle="Sin ventas" rowKey="id" />);
    expect(screen.getByText('Sin ventas')).toBeInTheDocument();
  });

  it('ordenación por columna', async () => {
    render(<DataTable columns={columns} rows={rows} rowKey="id" />);
    const header = screen.getByText('Total');
    await userEvent.click(header);
    const celdas = screen.getAllByRole('cell');
    expect(celdas[1]).toHaveTextContent('100');
    await userEvent.click(header);
    const celdas2 = screen.getAllByRole('cell');
    expect(celdas2[1]).toHaveTextContent('200');
  });

  it('paginación', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ id: i, nombre: `V${i}`, total: i }));
    render(<DataTable columns={columns} rows={many} pageSize={10} rowKey="id" />);
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
  });

  it('render personalizado por columna', () => {
    const cols = [{ key: 'estado', label: 'Estado', render: (r) => <strong>{r.estado}</strong> }];
    const data = [{ id: 1, estado: 'activa' }];
    render(<DataTable columns={cols} rows={data} rowKey="id" />);
    expect(screen.getByText('activa').tagName).toBe('STRONG');
  });
});
