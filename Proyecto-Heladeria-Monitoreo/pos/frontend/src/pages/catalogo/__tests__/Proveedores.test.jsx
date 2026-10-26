import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Proveedores from '../Proveedores.jsx';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  inactivate: vi.fn(),
  eliminarDefinitivo: vi.fn(),
}));

vi.mock('../../../services/inventarioService.js', () => ({
  proveedoresService: {
    list: mocks.list,
    create: mocks.create,
    update: mocks.update,
    inactivate: mocks.inactivate,
    eliminarDefinitivo: mocks.eliminarDefinitivo,
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
    mocks.eliminarDefinitivo.mockResolvedValue({});
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
    render(<Proveedores />);
    await screen.findByText('prueba 1');

    await userEvent.click(screen.getAllByRole('button', { name: 'Inactivar' })[0]);

    // El modal cuadrado del sistema pide confirmación
    expect(await screen.findByText('Inactivar proveedor')).toBeInTheDocument();
    const dialogos = screen.getAllByRole('button', { name: 'Inactivar' });
    await userEvent.click(dialogos[dialogos.length - 1]);

    await waitFor(() => {
      expect(mocks.inactivate).toHaveBeenCalledWith('p1');
    });
  });

  it('cancelar el modal no inactiva', async () => {
    render(<Proveedores />);
    await screen.findByText('prueba 1');

    await userEvent.click(screen.getAllByRole('button', { name: 'Inactivar' })[0]);
    expect(await screen.findByText('Inactivar proveedor')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mocks.inactivate).not.toHaveBeenCalled();
  });

  it('muestra Eliminar solo para inactivos', async () => {
    mocks.list.mockResolvedValueOnce([
      { id_proveedor: 'p1', nombre: 'activo 1', nit: '1', contacto: '', telefono: '', correo: '', estado: 'activo' },
      { id_proveedor: 'p2', nombre: 'inactivo 1', nit: '2', contacto: '', telefono: '', correo: '', estado: 'inactivo' },
    ]);
    render(<Proveedores />);
    await screen.findByText('inactivo 1');
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Inactivar' })).toHaveLength(1);
  });

  it('confirma la eliminación definitiva antes de llamar al servicio', async () => {
    mocks.list.mockResolvedValueOnce([
      { id_proveedor: 'p9', nombre: 'viejo', nit: '9', contacto: '', telefono: '', correo: '', estado: 'inactivo' },
    ]);
    render(<Proveedores />);
    await screen.findByText('viejo');

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Eliminar proveedor')).toBeInTheDocument();
    const dialogos = screen.getAllByRole('button', { name: 'Eliminar' });
    await userEvent.click(dialogos[dialogos.length - 1]);

    await waitFor(() => {
      expect(mocks.eliminarDefinitivo).toHaveBeenCalledWith('p9');
    });
  });

  it('cancelar el modal no elimina', async () => {
    mocks.list.mockResolvedValueOnce([
      { id_proveedor: 'p9', nombre: 'viejo', nit: '9', contacto: '', telefono: '', correo: '', estado: 'inactivo' },
    ]);
    render(<Proveedores />);
    await screen.findByText('viejo');

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Eliminar proveedor')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mocks.eliminarDefinitivo).not.toHaveBeenCalled();
  });

  it('muestra error si tiene historial asociado', async () => {
    mocks.list.mockResolvedValueOnce([
      { id_proveedor: 'p9', nombre: 'viejo', nit: '9', contacto: '', telefono: '', correo: '', estado: 'inactivo' },
    ]);
    mocks.eliminarDefinitivo.mockRejectedValueOnce(
      Object.assign(new Error('No se puede eliminar: tiene movimientos de inventario asociados'), { status: 409 })
    );
    render(<Proveedores />);
    await screen.findByText('viejo');

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const dialogos = await screen.findAllByRole('button', { name: 'Eliminar' });
    await userEvent.click(dialogos[dialogos.length - 1]);

    expect(await screen.findByText(/movimientos de inventario/i)).toBeInTheDocument();
  });
});
