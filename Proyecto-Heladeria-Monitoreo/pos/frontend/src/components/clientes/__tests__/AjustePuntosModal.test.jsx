import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AjustePuntosModal from '../AjustePuntosModal.jsx';

const mocks = vi.hoisted(() => ({ mockAjustar: vi.fn() }));

vi.mock('../../../services/customersService.js', () => ({
  listarClientes: vi.fn(),
  verCliente: vi.fn(),
  crearCliente: vi.fn(),
  actualizarCliente: vi.fn(),
  ajustarPuntos: mocks.mockAjustar,
  verVentasCliente: vi.fn(),
}));

vi.mock('../../common/RequirePermiso.jsx', () => ({
  default: ({ children }) => children,
}));

const cliente = { id_cliente: 'cl1', nombre: 'María', puntos_fidelidad: 120 };

describe('AjustePuntosModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('canje llama ajustarPuntos con puntos negativo', async () => {
    mocks.mockAjustar.mockResolvedValue({});
    const onDone = vi.fn();
    render(<AjustePuntosModal cliente={cliente} onClose={vi.fn()} onDone={onDone} />);
    await userEvent.selectOptions(screen.getByLabelText(/Tipo/i), 'canje');
    await userEvent.type(screen.getByLabelText(/Puntos/i), '50');
    await userEvent.type(screen.getByLabelText(/Motivo/i), 'Premio canje');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => {
      expect(mocks.mockAjustar).toHaveBeenCalledWith(
        'cl1',
        { puntos: -50, tipo: 'canje', motivo: 'Premio canje' }
      );
    });
    expect(onDone).toHaveBeenCalled();
  });

  it('motivo corto bloquea submit', async () => {
    render(<AjustePuntosModal cliente={cliente} onClose={vi.fn()} onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/Puntos/i), '10');
    await userEvent.type(screen.getByLabelText(/Motivo/i), 'ab');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mocks.mockAjustar).not.toHaveBeenCalled();
  });
});
