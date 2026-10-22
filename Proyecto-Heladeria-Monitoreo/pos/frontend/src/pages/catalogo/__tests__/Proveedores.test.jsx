import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Proveedores from '../Proveedores.jsx';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  inactivate: vi.fn(),
}));

vi.mock('../../../services/inventarioService.js', () => ({
  proveedoresService: {
    list: mocks.list,
    create: mocks.create,
    update: mocks.update,
    inactivate: mocks.inactivate,
  },
}));

vi.mock('../../../components/common/RequirePermiso.jsx', () => ({
  default: ({ children }) => children,
}));

const proveedores = [
  {
    id_proveedor: 'p1',
    nombre: 'prueba 1',
    nit: '82848540',
    contacto: 'persona',
    telefono: '76895349',
    correo: 'proveedor1@gmail.com',
    estado: 'activo',
  },
  {
    id_proveedor: 'p2',
    nombre: 'unitel',
    nit: '7854976',
    contacto: 'empresa',
    telefono: '70000000',
    correo: 'unitel@ejemplo.com',
    estado: 'activo',
  },
];

describe('Proveedores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue(proveedores);
    mocks.create.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
    mocks.inactivate.mockResolvedValue({});
  });

  it('carga y muestra los proveedores', async () => {
    render(<Proveedores />);
    expect(await screen.findByText('prueba 1')).toBeInTheDocument();
    expect(screen.getByText('unitel')).toBeInTheDocument();
  });

  it('filtra por nombre o NIT', async () => {
    render(<Proveedores />);
    await screen.findByText('prueba 1');

    await userEvent.type(screen.getByLabelText('Buscar proveedores'), 'unitel');

    expect(screen.getByText('unitel')).toBeInTheDocument();
    expect(screen.queryByText('prueba 1')).not.toBeInTheDocument();
  });

  it('crea un proveedor', async () => {
    render(<Proveedores />);
    await screen.findByText('prueba 1');

    await userEvent.type(screen.getByLabelText('Nombre'), 'Pedro');
    await userEvent.type(screen.getByLabelText('Correo'), 'pedro@ejemplo.com');
    await userEvent.click(screen.getByRole('button', { name: 'Crear proveedor' }));

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Pedro',
        correo: 'pedro@ejemplo.com',
      }));
    });
  });

  it('muestra el error de correo duplicado bajo el campo', async () => {
    mocks.create.mockRejectedValue(Object.assign(new Error('Correo duplicado'), { status: 409 }));
    render(<Proveedores />);
    await screen.findByText('prueba 1');

    await userEvent.type(screen.getByLabelText('Nombre'), 'Pedro');
    await userEvent.type(screen.getByLabelText('Correo'), 'proveedor1@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: 'Crear proveedor' }));

    expect(await screen.findByText('Este correo ya está asignado a otro proveedor.')).toBeInTheDocument();
  });

  it('confirma la inactivación antes de llamar al servicio', async () => {
    window.confirm = vi.fn(() => true);
    render(<Proveedores />);
    await screen.findByText('prueba 1');

    await userEvent.click(screen.getAllByRole('button', { name: 'Inactivar' })[0]);

    await waitFor(() => {
      expect(mocks.inactivate).toHaveBeenCalledWith('p1');
    });
  });
});
