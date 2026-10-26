import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Inventario from '../Inventario.jsx';

const mocks = vi.hoisted(() => ({
  mockInsumos: vi.fn(),
  mockMovimientos: vi.fn(),
  mockMovimiento: vi.fn(),
  mockCrearInsumo: vi.fn(),
  mockActualizarInsumo: vi.fn(),
}));

vi.mock('../../../services/inventarioService.js', () => ({
  inventarioService: {
    insumos: mocks.mockInsumos,
    movimientos: mocks.mockMovimientos,
    movimiento: mocks.mockMovimiento,
    crearInsumo: mocks.mockCrearInsumo,
    actualizarInsumo: mocks.mockActualizarInsumo,
  },
}));

vi.mock('../../../context/PermisosContext.jsx', () => ({
  usePermisos: () => ({ permisos: ['*'], loading: false, tienePermiso: () => true, recargar: vi.fn() }),
  PermisosProvider: ({ children }) => children,
}));

const INSUMO_OK = {
  id_insumo: '11111111-1111-4111-8111-111111111111',
  nombre: 'Leche entera', unidad_medida: 'litros',
  stock: 20, stock_minimo: 5, fecha_vencimiento: null, estado: 'disponible',
};
const INSUMO_BAJO = {
  id_insumo: '22222222-2222-4222-8222-222222222222',
  nombre: 'Azúcar', unidad_medida: 'kg',
  stock: 2, stock_minimo: 5, fecha_vencimiento: null, estado: 'disponible',
};
const INSUMO_VENCIDO = {
  id_insumo: '33333333-3333-4333-8333-333333333333',
  nombre: 'Crema', unidad_medida: 'litros',
  stock: 10, stock_minimo: 2, fecha_vencimiento: '2020-01-01', estado: 'disponible',
};
const INSUMO_POR_VENCER = {
  id_insumo: '44444444-4444-4333-8333-444444444444',
  nombre: 'Frutilla', unidad_medida: 'kg',
  stock: 10, stock_minimo: 2,
  fecha_vencimiento: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  estado: 'disponible',
};

function renderPage() {
  return render(<Inventario />);
}

describe('Inventario (HU-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockInsumos.mockResolvedValue([INSUMO_OK, INSUMO_BAJO, INSUMO_VENCIDO, INSUMO_POR_VENCER]);
    mocks.mockMovimientos.mockResolvedValue([]);
  });

  it('ingreso suma stock: registra movimiento y recarga la lista', async () => {
    mocks.mockMovimiento.mockResolvedValueOnce({ id_movimiento: 'm1' });
    // Tras el movimiento, el stock del insumo sube.
    mocks.mockInsumos
      .mockResolvedValueOnce([INSUMO_OK, INSUMO_BAJO, INSUMO_VENCIDO, INSUMO_POR_VENCER])
      .mockResolvedValue([{ ...INSUMO_OK, stock: 30 }, INSUMO_BAJO, INSUMO_VENCIDO, INSUMO_POR_VENCER]);
    renderPage();
    await screen.findByText('Leche entera');

    // Los Select de este formulario no tienen id: se ubican por rol+opciones.
    const combos = screen.getAllByRole('combobox');
    const insumoSelect = combos.find((c) => within(c).queryByText(/Leche entera/));
    expect(insumoSelect).toBeTruthy();
    await userEvent.selectOptions(insumoSelect, INSUMO_OK.id_insumo);
    await userEvent.type(screen.getByPlaceholderText('Cantidad'), '10');
    await userEvent.click(screen.getByRole('button', { name: /Registrar movimiento/ }));

    await waitFor(() => {
      expect(mocks.mockMovimiento).toHaveBeenCalledWith({
        insumo_id: INSUMO_OK.id_insumo,
        tipo: 'ingreso',
        cantidad: 10,
        motivo: null,
      });
    });
    expect(await screen.findByText(/Movimiento registrado/i)).toBeInTheDocument();
  });

  it('alerta de stock bajo visible en el insumo correspondiente', async () => {
    renderPage();
    const fila = (await screen.findByText('Azúcar')).closest('tr');
    expect(within(fila).getByText('Bajo')).toBeInTheDocument();
    expect(await screen.findByText(/con alerta/)).toBeInTheDocument();
  });

  it('vencido y por vencer marcan badge', async () => {
    renderPage();
    const filaVenc = (await screen.findByText('Crema')).closest('tr');
    expect(within(filaVenc).getByText('Vencido')).toBeInTheDocument();
    const filaPorVencer = (await screen.findByText('Frutilla')).closest('tr');
    expect(within(filaPorVencer).getByText('Por vencer')).toBeInTheDocument();
  });

  it('movimiento con motivo queda en la lista de movimientos', async () => {
    mocks.mockMovimientos.mockResolvedValue([
      { id_movimiento: 'm9', insumo_id: INSUMO_OK.id_insumo, tipo: 'salida', cantidad: 3, motivo: 'merma cocina', fecha: '2026-10-20T10:00:00Z' },
    ]);
    renderPage();
    expect(await screen.findByText('merma cocina')).toBeInTheDocument();
    expect(screen.getByText('salida')).toBeInTheDocument();
  });
});
