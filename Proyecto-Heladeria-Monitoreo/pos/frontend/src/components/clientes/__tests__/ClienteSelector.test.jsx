import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClienteSelector from '../ClienteSelector.jsx';

const mocks = vi.hoisted(() => ({ mockListar: vi.fn() }));

vi.mock('../../../services/customersService.js', () => ({
  listarClientes: mocks.mockListar,
  verCliente: vi.fn(),
  crearCliente: vi.fn(),
  actualizarCliente: vi.fn(),
  ajustarPuntos: vi.fn(),
  verVentasCliente: vi.fn(),
}));

describe('ClienteSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListar.mockResolvedValue([
      { id_cliente: 'cl1', nombre: 'María', puntos_fidelidad: 80 },
    ]);
  });

  it('escribe mar, elige María y verifica onSelect', async () => {
    const onSelect = vi.fn();
    render(<ClienteSelector value={null} onSelect={onSelect} />);
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre\/tel\/correo/), 'mar');
    expect(await screen.findByRole('button', { name: /María — 80 pts/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.mockListar).toHaveBeenCalledWith(expect.objectContaining({ q: 'mar', limit: 10 }));
    });
    await userEvent.click(screen.getByRole('button', { name: /María — 80 pts/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id_cliente: 'cl1', nombre: 'María' }));
  });

  it('botón Limpiar llama onSelect(null)', async () => {
    const onSelect = vi.fn();
    render(
      <ClienteSelector
        value={{ id_cliente: 'cl1', nombre: 'María', puntos_fidelidad: 80 }}
        onSelect={onSelect}
      />
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Limpiar' }));
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(null);
    });
  });
});
