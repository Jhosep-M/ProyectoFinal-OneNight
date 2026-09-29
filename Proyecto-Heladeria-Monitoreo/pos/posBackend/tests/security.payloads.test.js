'use strict';

/* Seguridad / payloads: alertSchema estricto, contratos, errorHandler, requestId. */

const fs = require('fs');
const path = require('path');
const { alertSchema } = require('../src/validators/alerts');
const { errorHandler } = require('../src/middlewares/errorHandler');
const { requestId } = require('../src/middlewares/requestId');

const ALERT_CONTRACT = path.join(
  __dirname, '..', '..', '..', 'shared', 'contracts', 'monitoring-to-pos', 'alert.schema.json'
);
const CONSUMPTION_CONTRACT = path.join(
  __dirname, '..', '..', '..', 'shared', 'contracts', 'pos-to-monitoring', 'consumption.schema.json'
);

const VALID_ALERT = {
  alertaId: '123e4567-e89b-12d3-a456-426614174000',
  nivel: 'critico',
  tipoRecurso: 'energia',
  mensaje: 'Consumo superior al umbral',
  fechaGeneracion: '2026-09-21T18:00:00.000Z',
};

describe('alertSchema (espejo estricto de alerts.v1)', () => {
  test('payload valido -> ok', () => {
    const r = alertSchema.safeParse(VALID_ALERT);
    expect(r.success).toBe(true);
  });

  test('nivel invalido -> fail', () => {
    const r = alertSchema.safeParse({ ...VALID_ALERT, nivel: 'URGENTE' });
    expect(r.success).toBe(false);
  });

  test('tipoRecurso invalido -> fail', () => {
    const r = alertSchema.safeParse({ ...VALID_ALERT, tipoRecurso: 'gas' });
    expect(r.success).toBe(false);
  });

  test('mensaje >500 caracteres -> fail', () => {
    const r = alertSchema.safeParse({ ...VALID_ALERT, mensaje: 'x'.repeat(501) });
    expect(r.success).toBe(false);
  });

  test('mensaje vacio -> fail', () => {
    const r = alertSchema.safeParse({ ...VALID_ALERT, mensaje: '' });
    expect(r.success).toBe(false);
  });

  test('alertaId no-uuid -> fail', () => {
    const r = alertSchema.safeParse({ ...VALID_ALERT, alertaId: 'no-uuid' });
    expect(r.success).toBe(false);
  });

  test('fechaGeneracion no-datetime -> fail', () => {
    const r = alertSchema.safeParse({ ...VALID_ALERT, fechaGeneracion: 'ayer' });
    expect(r.success).toBe(false);
  });

  test('campos extra -> fail (strict)', () => {
    const r = alertSchema.safeParse({ ...VALID_ALERT, userId: 'inyectado', admin: true });
    expect(r.success).toBe(false);
  });

  test('campo faltante -> fail', () => {
    const { mensaje, ...sinMensaje } = VALID_ALERT;
    expect(alertSchema.safeParse(sinMensaje).success).toBe(false);
  });

  test('SQLi en mensaje no rompe: se acepta como string plano (la ruta lo parametriza)', () => {
    const sqli = "'; DROP TABLE alerta_pos; --";
    const r = alertSchema.safeParse({ ...VALID_ALERT, mensaje: sqli });
    expect(r.success).toBe(true);
    expect(r.data.mensaje).toBe(sqli); // sin interpretar, sin escapar-retirar
  });

  test('XSS en mensaje se almacena plano sin ejecutarse (string inerte)', () => {
    const xss = '<script>alert(1)</script>';
    const r = alertSchema.safeParse({ ...VALID_ALERT, mensaje: xss });
    expect(r.success).toBe(true);
    expect(r.data.mensaje).toBe(xss);
    expect(typeof r.data.mensaje).toBe('string');
  });
});

describe('contratos compartidos', () => {
  test('ambos schemas existen, parsean como JSON y exigen additionalProperties=false', () => {
    for (const p of [ALERT_CONTRACT, CONSUMPTION_CONTRACT]) {
      expect(fs.existsSync(p)).toBe(true);
      const schema = JSON.parse(fs.readFileSync(p, 'utf8'));
      expect(schema.type).toBe('object');
      expect(Array.isArray(schema.required)).toBe(true);
      expect(schema.additionalProperties).toBe(false);
    }
  });

  test('ejemplo valido de alerta pasa el zod; ejemplo invalido falla', () => {
    const ejemploValido = {
      alertaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      nivel: 'advertencia',
      tipoRecurso: 'agua',
      mensaje: 'Consumo alto detectado',
      fechaGeneracion: '2026-09-21T18:00:00.000Z',
    };
    expect(alertSchema.safeParse(ejemploValido).success).toBe(true);
    expect(alertSchema.safeParse({ ...ejemploValido, nivel: 'critic' }).success).toBe(false);
    expect(alertSchema.safeParse({ ...ejemploValido, extra: 1 }).success).toBe(false);
  });

  test('ejemplo de consumo respeta el contrato pos-to-monitoring (campos requeridos)', () => {
    const schema = JSON.parse(fs.readFileSync(CONSUMPTION_CONTRACT, 'utf8'));
    const ejemplo = {
      consumoExternoId: '123e4567-e89b-12d3-a456-426614174000',
      tipoRecurso: 'agua',
      cantidad: 125.5,
      unidadMedida: 'litros',
      fechaConsumo: '2026-09-21T18:00:00.000Z',
      organizacionExternaId: '123e4567-e89b-12d3-a456-426614174001',
      origen: 'POS',
    };
    for (const campo of schema.required) {
      expect(ejemplo).toHaveProperty(campo);
    }
    expect(schema.properties.tipoRecurso.enum).toEqual(expect.arrayContaining(['agua', 'energia']));
    const invalido = { ...ejemplo, tipoRecurso: 'vapor' };
    expect(schema.properties.tipoRecurso.enum).not.toContain(invalido.tipoRecurso);
  });
});

describe('errorHandler', () => {
  function mockRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  }

  test('500 no expone detail/stack y propaga requestId', () => {
    const res = mockRes();
    const err = new Error('fallo');
    err.detail = 'password=secreto';
    err.stack = 'stack-con-rutas-internas';
    errorHandler(err, { id: 'req-123' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ error: 'Internal error', requestId: 'req-123' });
    expect(JSON.stringify(body)).not.toMatch(/secreto|stack-con-rutas/);
  });

  test('500 sin requestId tampoco filtra', () => {
    const res = mockRes();
    const err = Object.assign(new Error('x'), { status: 500, detail: 'secreto' });
    errorHandler(err, {}, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  test('4xx devuelve mensaje sin envolver en requestId', () => {
    const res = mockRes();
    errorHandler(Object.assign(new Error('Payload inválido'), { status: 400 }), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payload inválido' });
  });
});

describe('requestId', () => {
  test('header X-Request-Id presente en la respuesta', () => {
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();
    requestId(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(typeof req.id).toBe('string');
    expect(req.id.length).toBeGreaterThan(0);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
  });

  test('reutiliza x-request-id entrante', () => {
    const req = { headers: { 'x-request-id': 'cliente-1' } };
    const res = { setHeader: jest.fn() };
    requestId(req, res, jest.fn());
    expect(req.id).toBe('cliente-1');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'cliente-1');
  });

  test('dos peticiones sin header generan ids distintos', () => {
    const mk = () => ({ req: { headers: {} }, res: { setHeader: jest.fn() } });
    const a = mk();
    const b = mk();
    requestId(a.req, a.res, jest.fn());
    requestId(b.req, b.res, jest.fn());
    expect(a.req.id).not.toBe(b.req.id);
  });
});
