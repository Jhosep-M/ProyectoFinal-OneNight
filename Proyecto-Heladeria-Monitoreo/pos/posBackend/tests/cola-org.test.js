'use strict';

/* Persona 4 — Worker: sin ORGANIZACION_EXTERNA_ID valida no debe quemar
 * reintentos enviando null (viola `required` del contrato). Sin DB ni red.
 */

process.env.MONITOREO_URL = 'http://localhost:9/api/v1/integrations/consumption';
process.env.MONITOREO_API_KEY = 'test-monitoreo-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(), transaction: jest.fn() },
}));

jest.mock('../src/integrations/monitoreoClient', () => ({
  enviarConsumoAMonitoreo: jest.fn(),
}));

const { sequelize } = require('../src/config/database');
const { processColaOnce } = require('../src/jobs/colaWorker');

describe('processColaOnce — organizacion requerida', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MONITOREO_URL = 'http://localhost:9/api/v1/integrations/consumption';
    process.env.MONITOREO_API_KEY = 'test-monitoreo-key';
    delete process.env.ORGANIZACION_EXTERNA_ID;
  });

  test('sin ORGANIZACION_EXTERNA_ID -> throw antes de tocar DB', async () => {
    await expect(processColaOnce()).rejects.toThrow(/ORGANIZACION_EXTERNA_ID/i);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('con UUID invalido -> throw antes de tocar DB', async () => {
    process.env.ORGANIZACION_EXTERNA_ID = 'no-uuid';
    await expect(processColaOnce()).rejects.toThrow(/ORGANIZACION_EXTERNA_ID/i);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('con UUID valido -> procede (toma cola)', async () => {
    process.env.ORGANIZACION_EXTERNA_ID = '123e4567-e89b-12d3-a456-426614174001';
    sequelize.transaction.mockImplementationOnce(async (cb) => cb({}));
    sequelize.query.mockResolvedValueOnce([[]]);
    await expect(processColaOnce()).resolves.toBe(0);
  });
});
