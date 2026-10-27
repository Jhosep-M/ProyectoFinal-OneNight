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

  it('no busca sin texto (sin lista inicial con 100+ clientes)', async () => {
    const onSelect = vi.fn();
    render(<ClienteSelector value={null} onSelect={onSelect} />);
    // Espera a que pase el debounce inicial sin disparar la API
    await waitFor(() => {
      expect(mocks.mockListar).not.toHaveBeenCalled();
    });
    expect(screen.queryByRole('button', { name: /María/ })).not.toBeInTheDocument();
  });

  it('no busca con 1 caracter, pide al menos 2', async () => {
    const onSelect = vi.fn();
    render(<ClienteSelector value={null} onSelect={onSelect} />);
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre/), 'm');
    expect(await screen.findByText(/Escribe al menos 2 caracteres/)).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.mockListar).not.toHaveBeenCalled();
    });
  });

  it('escribe mar, elige María y verifica onSelect', async () => {
    const onSelect = vi.fn();
    render(<ClienteSelector value={null} onSelect={onSelect} />);
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre/), 'mar');
    expect(await screen.findByRole('button', { name: /María — 80 pts/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.mockListar).toHaveBeenCalledWith(expect.objectContaining({ q: 'mar', limit: 8 }));
    });
    await userEvent.click(screen.getByRole('button', { name: /María — 80 pts/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id_cliente: 'cl1', nombre: 'María' }));
  });

  it('muestra Sin resultados cuando la búsqueda no coincide', async () => {
    mocks.mockListar.mockResolvedValueOnce([]);
    const onSelect = vi.fn();
    render(<ClienteSelector value={null} onSelect={onSelect} />);
    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre/), 'zzz');
    expect(await screen.findByText(/Sin resultados para/)).toBeInTheDocument();
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
