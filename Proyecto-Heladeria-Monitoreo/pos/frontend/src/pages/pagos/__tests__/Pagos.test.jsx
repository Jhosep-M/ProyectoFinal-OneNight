import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Pagos from '../Pagos.jsx';

const mocks = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockCrear: vi.fn(),
  mockActualizar: vi.fn(),
}));

vi.mock('../../../services/pagosService.js', () => ({
  listarMetodosAdmin: mocks.mockListar,
  crearMetodo: mocks.mockCrear,
  actualizarMetodo: mocks.mockActualizar,
}));

vi.mock('../../../context/PermisosContext.jsx', () => ({
  usePermisos: () => ({ permisos: ['*'], loading: false, tienePermiso: () => true, recargar: vi.fn() }),
  PermisosProvider: ({ children }) => children,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Pagos />
    </MemoryRouter>
  );
}

describe('Pagos (HU-20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListar.mockResolvedValue([
      { id_metodo_pago: 'm1', nombre: 'Efectivo', estado: 'activo' },
      { id_metodo_pago: 'm2', nombre: 'QR', estado: 'activo' },
    ]);
  });

  it('lista métodos activos', async () => {
    renderPage();
    expect(await screen.findByText('Efectivo')).toBeInTheDocument();
    expect(screen.getByText('QR')).toBeInTheDocument();
    expect(await screen.findByText(/Métodos activos \(2\)/)).toBeInTheDocument();
  });

  it('crear muestra error humano ante duplicado', async () => {
    mocks.mockCrear.mockRejectedValueOnce(new Error('Método de pago duplicado'));
    renderPage();
    await screen.findByText('Efectivo');
    await userEvent.type(screen.getByLabelText('Nombre del método'), 'Efectivo');
    await userEvent.click(screen.getByRole('button', { name: /Crear método/ }));

    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith('Efectivo');
    });
    expect(await screen.findByText(/duplicado/i)).toBeInTheDocument();
    // La lista no se recargó con éxito: sigue intacta.
    expect(screen.getByText('QR')).toBeInTheDocument();
  });

  it('desactivar llama al servicio y confirma', async () => {
    mocks.mockActualizar.mockResolvedValueOnce({ id_metodo_pago: 'm2', estado: 'inactivo' });
    mocks.mockListar.mockReset();
    mocks.mockListar
      .mockResolvedValueOnce([
        { id_metodo_pago: 'm1', nombre: 'Efectivo', estado: 'activo' },
        { id_metodo_pago: 'm2', nombre: 'QR', estado: 'activo' },
      ])
      .mockResolvedValue([
        { id_metodo_pago: 'm1', nombre: 'Efectivo', estado: 'activo' },
      ]);
    renderPage();
    const filaQR = (await screen.findByText('QR')).closest('tr');
    await userEvent.click(within(filaQR).getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => {
      expect(mocks.mockActualizar).toHaveBeenCalledWith('m2', 'inactivo');
    });
    expect(await screen.findByText(/desactivado/i)).toBeInTheDocument();
  });
});
