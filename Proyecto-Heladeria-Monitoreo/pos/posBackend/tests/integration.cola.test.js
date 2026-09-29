'use strict';

/* Integracion POS->Monitoreo: worker de cola + monitoreoClient. Sin DB ni red real. */

process.env.MONITOREO_URL = 'http://localhost:9/api/v1/integrations/consumption';
process.env.MONITOREO_API_KEY = 'test-monitoreo-key';
process.env.ORGANIZACION_EXTERNA_ID = '123e4567-e89b-12d3-a456-426614174001';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(), transaction: jest.fn() },
}));

jest.mock('../src/integrations/monitoreoClient', () => ({
  enviarConsumoAMonitoreo: jest.fn(),
}));

const { sequelize } = require('../src/config/database');
const mockedClient = require('../src/integrations/monitoreoClient');
const { processColaOnce, MAX_INTENTOS } = require('../src/jobs/colaWorker');
const clientReal = jest.requireActual('../src/integrations/monitoreoClient');

let colaRows = [];

function filaCola(over = {}) {
  return {
    id_cola: 'cola-1',
    consumo_id: '123e4567-e89b-12d3-a456-426614174000',
    idempotency_key: 'idem-key-12345678',
    intentos: 0,
    tipo_recurso: 'agua',
    cantidad: '125.5',
    unidad_medida: 'litros',
    fecha_consumo: '2026-09-21T18:00:00.000Z',
    ...over,
  };
}

function queriesContaining(substr) {
  return sequelize.query.mock.calls.filter(([sql]) => typeof sql === 'string' && sql.includes(substr));
}

beforeEach(() => {
  jest.clearAllMocks();
  colaRows = [];
  process.env.MONITOREO_URL = 'http://localhost:9/api/v1/integrations/consumption';
  process.env.MONITOREO_API_KEY = 'test-monitoreo-key';
  process.env.ORGANIZACION_EXTERNA_ID = '123e4567-e89b-12d3-a456-426614174001';
  sequelize.transaction.mockImplementation(async (cb) => cb({}));
  sequelize.query.mockImplementation(async (sql) => {
    if (typeof sql === 'string' && sql.includes('FROM cola_integracion ci JOIN')) {
      return [colaRows];
    }
    return [[]];
  });
});

describe('colaWorker', () => {
  test('MAX_INTENTOS es 10', () => {
    expect(MAX_INTENTOS).toBe(10);
  });

  test('pendiente ok -> estado enviado (cola + consumo)', async () => {
    colaRows = [filaCola()];
    mockedClient.enviarConsumoAMonitoreo.mockResolvedValueOnce({ ok: true, status: 200, body: 'ack' });
    const n = await processColaOnce();
    expect(n).toBe(1);
    expect(queriesContaining("estado='enviado'").length).toBeGreaterThanOrEqual(1);
    expect(queriesContaining("UPDATE consumo_reportado SET estado='enviado'").length).toBe(1);
  });

  test('fallo (ok:false) -> estado error con backoff (proximo_intento)', async () => {
    colaRows = [filaCola()];
    mockedClient.enviarConsumoAMonitoreo.mockResolvedValueOnce({ ok: false, status: 500, body: 'boom' });
    const n = await processColaOnce();
    expect(n).toBe(1);
    const errs = queriesContaining("estado='error'");
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs.some(([, opts]) => opts && opts.replacements && opts.replacements.err === 'boom')).toBe(true);
    expect(queriesContaining('proximo_intento').length).toBeGreaterThanOrEqual(1);
  });

  test('10 intentos alcanzados -> cancelado (DLQ, sin proximo_intento)', async () => {
    colaRows = [filaCola({ intentos: 9 })]; // claim lo sube a 10 -> agotado
    mockedClient.enviarConsumoAMonitoreo.mockResolvedValueOnce({ ok: false, status: 500, body: 'boom' });
    await processColaOnce();
    const canc = queriesContaining("estado='cancelado'");
    expect(canc.length).toBeGreaterThanOrEqual(1);
    expect(canc[0][0]).toMatch(/proximo_intento=NULL/);
  });

  test('Monitoreo caido (fetch rechaza) -> error con reintento programado', async () => {
    colaRows = [filaCola()];
    mockedClient.enviarConsumoAMonitoreo.mockRejectedValueOnce(new Error('error al contactar monitoreo'));
    await processColaOnce();
    expect(queriesContaining("estado='error'").length).toBeGreaterThanOrEqual(1);
    expect(queriesContaining('proximo_intento').length).toBeGreaterThanOrEqual(1);
    expect(queriesContaining("estado='cancelado'").length).toBe(0);
  });

  test('payload enviado incluye organizacionExternaId, idempotencyKey y origen POS', async () => {
    colaRows = [filaCola()];
    mockedClient.enviarConsumoAMonitoreo.mockResolvedValueOnce({ ok: true, status: 200, body: 'ack' });
    await processColaOnce();
    expect(mockedClient.enviarConsumoAMonitoreo).toHaveBeenCalledTimes(1);
    const [payload, apiKey, url] = mockedClient.enviarConsumoAMonitoreo.mock.calls[0];
    expect(payload.organizacionExternaId).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(payload.consumoExternoId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(payload.idempotencyKey).toBe('idem-key-12345678');
    expect(payload.origen).toBe('POS');
    expect(apiKey).toBe('test-monitoreo-key');
    expect(url).toBe(process.env.MONITOREO_URL);
  });

  test('sin MONITOREO_URL/API_KEY -> throw antes de tocar DB', async () => {
    delete process.env.MONITOREO_URL;
    colaRows = [filaCola()];
    await expect(processColaOnce()).rejects.toThrow(/MONITOREO_URL/);
  });
});

describe('monitoreoClient (modulo real, fetch mockeado)', () => {
  const realFetch = global.fetch;
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    global.fetch = realFetch;
    process.env.NODE_ENV = prevNodeEnv;
    jest.clearAllMocks();
  });

  test('ok -> { ok, status, body }', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => 'recibido' }));
    const r = await clientReal.enviarConsumoAMonitoreo({ a: 1 }, 'k', 'http://m.local/x', 1000);
    expect(r).toEqual({ ok: true, status: 200, body: 'recibido' });
  });

  test('timeout (AbortError) -> mensaje de timeout', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    global.fetch = jest.fn(async () => {
      throw abortErr;
    });
    await expect(
      clientReal.enviarConsumoAMonitoreo({ a: 1 }, 'k', 'http://m.local/x', 50)
    ).rejects.toThrow(/timeout/);
  });

  test('fetch rechaza generico -> error al contactar', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    await expect(
      clientReal.enviarConsumoAMonitoreo({ a: 1 }, 'k', 'http://m.local/x', 1000)
    ).rejects.toThrow(/error al contactar monitoreo/);
  });

  test('http en produccion -> exige HTTPS', async () => {
    process.env.NODE_ENV = 'production';
    await expect(
      clientReal.enviarConsumoAMonitoreo({ a: 1 }, 'k', 'http://m.local/x', 1000)
    ).rejects.toThrow(/https/);
  });

  test('https en produccion -> pasa', async () => {
    process.env.NODE_ENV = 'production';
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => 'ok' }));
    const r = await clientReal.enviarConsumoAMonitoreo({ a: 1 }, 'k', 'https://m.local/x', 1000);
    expect(r.ok).toBe(true);
  });

  test('URL invalida -> throw', async () => {
    await expect(clientReal.enviarConsumoAMonitoreo({ a: 1 }, 'k', 'no-es-url', 1000)).rejects.toThrow(
      /invalida/
    );
  });

  test('args invalidos (sin url / sin apiKey) -> throw', async () => {
    await expect(clientReal.enviarConsumoAMonitoreo({ a: 1 }, 'k', '', 1000)).rejects.toThrow();
    await expect(clientReal.enviarConsumoAMonitoreo({ a: 1 }, '', 'http://m.local', 1000)).rejects.toThrow();
    await expect(clientReal.enviarConsumoAMonitoreo({ a: 1 }, null, 'http://m.local', 1000)).rejects.toThrow();
  });
});
