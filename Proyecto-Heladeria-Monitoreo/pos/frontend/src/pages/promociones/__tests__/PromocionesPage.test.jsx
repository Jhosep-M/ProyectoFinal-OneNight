import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import PromocionesPage from '../PromocionesPage.jsx';

const mocks = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockVer: vi.fn(),
  mockCrear: vi.fn(),
  mockProductosList: vi.fn(),
}));

vi.mock('../../../services/promotionsService.js', () => ({
  listarPromociones: mocks.mockListar,
  verPromocion: mocks.mockVer,
  crearPromocion: mocks.mockCrear,
  actualizarPromocion: vi.fn(),
}));

vi.mock('../../../services/productosService.js', () => ({
  productosService: { list: mocks.mockProductosList },
}));

vi.mock('../../../context/AuthContext.jsx', () => ({ useAuth: () => ({ session: { user: { email: 'c@h.com' } }, loading: false, signOut: vi.fn() }), AuthProvider: ({ children }) => children }));

function renderPromos() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <PromocionesPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('PromocionesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockListar.mockResolvedValue([
      { id_promocion: 'pr1', nombre: '2x1 Helado', porcentaje_descuento: 50, fecha_inicio: '2026-09-01', fecha_fin: null, estado: 'activa', productos_count: 3 },
    ]);
    mocks.mockProductosList.mockResolvedValue([
      { id_producto: 'p1', nombre: 'Helado Chocolate' },
      { id_producto: 'p2', nombre: 'Helado Vainilla' },
    ]);
  });

  it('carga y muestra promociones', async () => {
    renderPromos();
    expect(await screen.findByText('2x1 Helado')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('crear promocion llama al servicio', async () => {
    mocks.mockCrear.mockResolvedValue({ id_promocion: 'pr2' });
    renderPromos();
    await screen.findByText('2x1 Helado');
    await userEvent.type(screen.getByPlaceholderText('nombre'), '3x2');
    await userEvent.type(screen.getByPlaceholderText('descuento %'), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(mocks.mockCrear).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: '3x2', porcentaje_descuento: 30 })
      );
    });
  });

  it('editar carga datos al formulario', async () => {
    mocks.mockVer.mockResolvedValue({
      id_promocion: 'pr1', nombre: '2x1 Helado', porcentaje_descuento: 50,
      fecha_inicio: '2026-09-01', fecha_fin: null, estado: 'activa',
      productos: [{ producto_id: 'p1' }],
    });
    renderPromos();
    await screen.findByText('2x1 Helado');
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await screen.findByDisplayValue('2x1 Helado')).toBeInTheDocument();
  });
});
