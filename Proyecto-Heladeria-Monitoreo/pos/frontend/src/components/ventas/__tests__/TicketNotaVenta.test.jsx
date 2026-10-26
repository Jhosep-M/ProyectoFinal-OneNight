import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TicketNotaVenta from '../TicketNotaVenta.jsx';

const ventaDemo = {
  id: 'venta-123456789',
  fecha: '2026-10-26T10:00:00',
  cajero: 'caja@heladeria.com',
  turno: 'turno-abc123',
  cliente: 'Luis Hidalgo',
  items: [{ nombre: 'Cono Triple', cantidad: 1, precio: 25 }],
  total: 25,
  metodoPago: 'efectivo',
};

describe('TicketNotaVenta', () => {
  it('muestra nombre del local, items y total sin IVA ni NIT', () => {
    render(<TicketNotaVenta venta={ventaDemo} />);
    expect(screen.getByText(/NOTA DE VENTA/i)).toBeInTheDocument();
    expect(screen.getByText(/Cono Triple/)).toBeInTheDocument();
    expect(screen.queryByText(/IVA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NIT/i)).not.toBeInTheDocument();
  });
});
