'use strict';

/* Bloque pedidos — migracion 014: pedido.mesa_id nullable (Mostrador / Para llevar).
 * Fija el contenido de la migracion canonica y la coherencia con el modelo.
 * El frontend (PedidosPage) y el backend (routes/orders.js) envian mesa_id=null
 * para pedidos de mostrador; por eso la columna no puede ser NOT NULL. */

const fs = require('fs');
const path = require('path');

const MIGRATION = path.join(
  __dirname, '..', '..', '..', 'database', 'pos', 'migrations', '014-pedido-mesa-id-nullable.sql'
);

describe('migracion 014 — pedido.mesa_id nullable', () => {
  test('existe la migracion canonica', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('permite NULL en public.pedido.mesa_id', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/ALTER TABLE public\.pedido ALTER COLUMN mesa_id DROP NOT NULL/);
  });

  test('el modelo Pedido declara mesa_id allowNull: true', () => {
    const model = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'models', 'Pedido.js'), 'utf8'
    );
    expect(model).toMatch(/mesa_id:\s*\{[^}]*allowNull:\s*true/);
  });
});
