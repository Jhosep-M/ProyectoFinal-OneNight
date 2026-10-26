import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Reportes from '../Reportes.jsx';

const mocks = vi.hoisted(() => ({
  mockListarVentas: vi.fn(),
  mockListarAuditoria: vi.fn(),
  mockApiFetch: vi.fn(),
  mockGetSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'tok' } } })),
  permiteExportar: true,
}));

vi.mock('../../../services/ventasService.js', () => ({
  listarVentas: mocks.mockListarVentas,
  listarMetodosPago: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../services/auditService.js', () => ({
  listarAuditoria: mocks.mockListarAuditoria,
}));

vi.mock('../../../services/api.js', () => ({
  apiFetch: mocks.mockApiFetch,
  BASE: 'http://localhost:3000/api/v1',
  supabase: { auth: { getSession: mocks.mockGetSession } },
}));

vi.mock('../../../context/PermisosContext.jsx', () => ({
  usePermisos: () => ({
    permisos: mocks.permiteExportar ? ['*'] : [],
    loading: false,
    tienePermiso: (p) => mocks.permiteExportar && (p === 'turno.consultar.todos' || p === '*'),
    recargar: vi.fn(),
  }),
  PermisosProvider: ({ children }) => children,
}));

const CIERRE = {
  desde: '2026-10-26', hasta: '2026-10-26',
  totalVentas: 3, montoTotal: 150,
  porMetodo: [{ metodo: 'Efectivo', total: 100, pagos: 2 }],
  porTurno: [{ turno_id: 't1111111-1111-4111-8111-111111111111', ventas: 3, total: 150 }],
  topProductos: [{ producto_id: 'p1', producto: 'Helado Vainilla', cantidad: 5, total: 125 }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Reportes />
    </MemoryRouter>
  );
}

describe('Reportes (HU-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permiteExportar = true;
    mocks.mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    mocks.mockApiFetch.mockResolvedValue(CIERRE);
    mocks.mockListarVentas.mockResolvedValue([]);
    mocks.mockListarAuditoria.mockResolvedValue({ total: 7 });
    global.fetch?.mockRestore?.();
  });

  it('render con datos mock: resumen, método, top y turno', async () => {
    renderPage();
    expect(await screen.findByText('Efectivo')).toBeInTheDocument();
    expect(screen.getByText('Helado Vainilla')).toBeInTheDocument();
    expect(screen.getAllByText('Bs 150,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('export genera archivo CSV descargable', async () => {
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPage();
    await screen.findByText('Efectivo');
    await userEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
    });
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/csv');
    // jsdom Blob no tiene .text(): se lee con FileReader.
    const texto = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
    expect(texto).toContain('metodo,"Efectivo",2,100');
    expect(texto).toContain('producto,"Helado Vainilla",5,125');
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('HU-25: click Exportar descarga del endpoint /reports/export con Bearer', async () => {
    const csv = 'seccion,clave,cantidad,total\nmetodo,Efectivo,2,100';
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob([csv], { type: 'text/csv;charset=utf-8' })),
    }));
    global.fetch = fetchMock;
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPage();
    await screen.findByText('Efectivo');
    await userEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/reports\/export/);
    expect(url).toMatch(/formato=csv/);
    expect(opts.headers.Authorization).toBe('Bearer tok');
    expect(createObjectURL).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('HU-25: botón Exportar oculto sin permiso turno.consultar.todos', async () => {
    mocks.permiteExportar = false;
    renderPage();
    await screen.findByText('Efectivo');
    expect(screen.queryByRole('button', { name: /Exportar CSV/ })).not.toBeInTheDocument();
  });
});
