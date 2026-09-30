import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecetasPage from '../RecetasPage.jsx';

vi.mock('../../../services/productosService.js', () => ({
  productosService: { list: () => Promise.resolve([{ id_producto: 'p1', nombre: 'Cono Simple' }]) },
  categoriasService: { list: () => Promise.resolve([]) },
}));
vi.mock('../../../services/inventarioService.js', () => ({
  inventarioService: { insumos: () => Promise.resolve([]) },
}));
vi.mock('../../../services/recetasService.js', () => ({
  recetasService: { list: () => Promise.resolve([]) },
}));
vi.mock('../../../context/PermisosContext.jsx', () => ({
  usePermisos: () => ({ permisos: ['*'], loading: false, tienePermiso: () => true, recargar: vi.fn() }),
  PermisosProvider: ({ children }) => children,
}));

describe('RecetasPage', () => {
  it('muestra buscador y detalle de receta', async () => {
    render(<RecetasPage />);
    expect(await screen.findByPlaceholderText(/buscar producto/i)).toBeInTheDocument();
    const detalles = await screen.findAllByText(/receta de cono simple/i, {}, { timeout: 3000 });
    expect(detalles.length).toBeGreaterThan(0);
  });
});
