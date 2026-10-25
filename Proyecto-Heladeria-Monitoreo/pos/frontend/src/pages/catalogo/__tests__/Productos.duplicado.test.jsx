import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Productos from '../Productos.jsx';

const CAT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CAT2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  inactivate: vi.fn(),
  listCat: vi.fn(),
}));

vi.mock('../../../services/productosService.js', () => ({
  productosService: {
    list: mocks.list,
    create: mocks.create,
    update: mocks.update,
    inactivate: mocks.inactivate,
  },
  categoriasService: {
    list: mocks.listCat,
  },
}));

vi.mock('../../../components/common/RequirePermiso.jsx', () => ({
  default: ({ children }) => children,
}));

const items = [
  {
    id_producto: 'p1',
    nombre: 'Helado Vainilla',
    categoria_id: CAT,
    categoria: 'Helados',
    precio: 10,
    stock: 5,
    stock_minimo: 1,
    estado: 'activo',
    imagen_url: null,
  },
];

describe('Productos duplicado por categoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue(items);
    mocks.listCat.mockResolvedValue([
      { id_categoria: CAT, nombre: 'Helados' },
      { id_categoria: CAT2, nombre: 'Café' },
    ]);
    mocks.create.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
    mocks.inactivate.mockResolvedValue({});
  });

  // Los labels de Input/Select no usan htmlFor, se localiza por placeholder/rol.
  const nombreInput = () => screen.getByPlaceholderText('Ej. Cono Simple');
  const categoriaSelect = () => screen.getByRole('combobox');

  it('escribir nombre existente (distinto case/espacios) bloquea Guardar', async () => {
    render(<Productos />);
    await screen.findByText('Helado Vainilla');

    await userEvent.selectOptions(categoriaSelect(), CAT);
    await userEvent.type(nombreInput(), 'helado  vainilla ');

    expect(await screen.findByText('Ya existe en esta categoría')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('mismo nombre en otra categoria no bloquea', async () => {
    render(<Productos />);
    await screen.findByText('Helado Vainilla');

    await userEvent.selectOptions(categoriaSelect(), CAT2);
    await userEvent.type(nombreInput(), 'helado  vainilla ');

    await waitFor(() => {
      expect(screen.queryByText('Ya existe en esta categoría')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Crear' })).not.toBeDisabled();
  });

  it('muestra el 409 del backend en el Alert', async () => {
    mocks.create.mockRejectedValueOnce(
      Object.assign(new Error('Ya existe un producto con ese nombre en la categoría'), { status: 409 })
    );
    render(<Productos />);
    await screen.findByText('Helado Vainilla');

    await userEvent.type(nombreInput(), 'Cono Nuevo');
    await userEvent.type(screen.getByPlaceholderText('12,00'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText('Ya existe un producto con ese nombre en la categoría')).toBeInTheDocument();
  });
});
