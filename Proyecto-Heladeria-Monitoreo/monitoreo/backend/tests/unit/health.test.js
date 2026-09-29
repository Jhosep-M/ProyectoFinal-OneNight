const { test, before, after } = require('node:test');
const assert = require('node:assert');

process.env.NODE_ENV = 'test'; // ANTES de requerir src/: apaga pino-http autoLogging y el banner de dotenv
process.env.PORT = '0'; // puerto efímero en tests

let server; let base;

before(async () => {
  const { createApp } = require('../../src/app');
  const app = createApp();
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test('GET /health responde ok con nombre del servicio', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.service, 'monitoreo-backend');
  assert.ok(typeof body.ts === 'string');
});

test('ruta desconocida responde 404 con { error } sin stack trace', async () => {
  const res = await fetch(`${base}/no-existe`);
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.ok(body.error);
  assert.ok(!JSON.stringify(body).includes('at '), 'no debe filtrar stack traces');
});

test('X-Request-Id está presente en la respuesta', async () => {
  const res = await fetch(`${base}/health`);
  assert.ok(res.headers.get('x-request-id'));
});
