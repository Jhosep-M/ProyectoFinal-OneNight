'use strict';

/* Integracion Monitoreo->POS: POST /api/v1/integrations/alerts via supertest, DB mockeada. */

process.env.POS_ALERT_API_KEY = 'test-alert-key-123';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('../src/config/database', () => ({
  sequelize: { query: jest.fn(), transaction: jest.fn() },
}));

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { createApp } = require('../src/app');

const VALID = {
  alertaId: '123e4567-e89b-12d3-a456-426614174000',
  nivel: 'critico',
  tipoRecurso: 'energia',
  mensaje: 'Consumo superior al umbral',
  fechaGeneracion: '2026-09-21T18:00:00.000Z',
};

let app;
beforeAll(() => {
  app = createApp();
});
beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/integrations/alerts', () => {
  test('201 primera recepcion (INSERT devuelve fila)', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_entrega: 'ent-1' }]]) // entrega_alerta ON CONFLICT -> fila nueva
      .mockResolvedValueOnce([[{}]]); // alerta_pos insert
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send(VALID);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: true, alertaId: VALID.alertaId });
    expect(sequelize.query).toHaveBeenCalledTimes(2);
  });

  test('reenvio del mismo alertaId -> 200 already_received (ON CONFLICT devuelve [])', async () => {
    sequelize.query.mockResolvedValueOnce([[]]); // conflicto: sin fila
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send(VALID);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ already_received: true, alertaId: VALID.alertaId });
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('400 payload invalido (nivel fuera de enum)', async () => {
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send({ ...VALID, nivel: 'URGENTE' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Payload inválido' });
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('400 campos extra (strict)', async () => {
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send({ ...VALID, admin: true });
    expect(res.status).toBe(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('401 sin x-api-key', async () => {
    const res = await request(app).post('/api/v1/integrations/alerts').send(VALID);
    expect(res.status).toBe(401);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('401 con key incorrecta', async () => {
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'key-incorrecta')
      .send(VALID);
    expect(res.status).toBe(401);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('el header de auth es x-api-key: Bearer en Authorization NO autentica', async () => {
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('Authorization', 'Bearer test-alert-key-123')
      .send(VALID);
    expect(res.status).toBe(401);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('SQLi en mensaje usa parametrizadas: replacements y sin interpolacion', async () => {
    const sqli = "'; DROP TABLE alerta_pos; --";
    sequelize.query
      .mockResolvedValueOnce([[{ id_entrega: 'ent-2' }]])
      .mockResolvedValueOnce([[{}]]);
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send({ ...VALID, mensaje: sqli });
    expect(res.status).toBe(201);
    for (const [sql, opts] of sequelize.query.mock.calls) {
      expect(opts).toHaveProperty('replacements');
      expect(sql).not.toMatch(/DROP TABLE/);
    }
    const alertaInsert = sequelize.query.mock.calls[1];
    expect(alertaInsert[1].replacements.mensaje).toContain(sqli);
  });

  test('XSS en mensaje se acepta como texto plano y llega a replacements sin ejecutar', async () => {
    const xss = '<script>alert(1)</script>';
    sequelize.query
      .mockResolvedValueOnce([[{ id_entrega: 'ent-3' }]])
      .mockResolvedValueOnce([[{}]]);
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send({ ...VALID, mensaje: xss });
    expect(res.status).toBe(201);
    expect(sequelize.query.mock.calls[1][1].replacements.mensaje).toContain(xss);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('respuesta incluye X-Request-Id', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send(VALID);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('INSERT usa columnas reales: alerta_externa_id + ON CONFLICT (alerta_externa_id)', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_entrega: 'ent-9' }]])
      .mockResolvedValueOnce([[{}]]);
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send(VALID);
    expect(res.status).toBe(201);
    const [sqlEntrega, optsEntrega] = sequelize.query.mock.calls[0];
    expect(sqlEntrega).toMatch(/INSERT INTO entrega_alerta/);
    expect(sqlEntrega).toMatch(/alerta_externa_id/);
    expect(sqlEntrega).toMatch(/ON CONFLICT \(alerta_externa_id\)/);
    expect(sqlEntrega).not.toMatch(/sistema_destino/);
    expect(sqlEntrega).not.toMatch(/\(\s*alerta_id\s*,/);
    expect(optsEntrega.replacements.alertaId).toBe(VALID.alertaId);
  });

  test("mapea nivel del contrato al CHECK de alerta_pos (advertencia->medio)", async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_entrega: 'ent-10' }]])
      .mockResolvedValueOnce([[{}]]);
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send({ ...VALID, nivel: 'advertencia' });
    expect(res.status).toBe(201);
    const [, optsAlerta] = sequelize.query.mock.calls[1];
    expect(optsAlerta.replacements.nivel).toBe('medio');
  });

  test("nivel critico se guarda tal cual", async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ id_entrega: 'ent-11' }]])
      .mockResolvedValueOnce([[{}]]);
    const res = await request(app)
      .post('/api/v1/integrations/alerts')
      .set('x-api-key', 'test-alert-key-123')
      .send(VALID);
    expect(res.status).toBe(201);
    const [, optsAlerta] = sequelize.query.mock.calls[1];
    expect(optsAlerta.replacements.nivel).toBe('critico');
  });
});
