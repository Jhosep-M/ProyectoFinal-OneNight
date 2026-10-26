'use strict';

/* Migración 025: columna pedido.origen ('mesa' | 'mostrador' | 'venta_directa').
 * El espejo de venta directa (Ventas → Cocina) ya está cobrado: visible en
 * Cocina, sin botón Cobrar en Pedidos/Mesero, 409 en POST /:id/cobrar.
 * Idempotente, sin DROP/DELETE.
 */

const fs = require('fs');
const path = require('path');

const MIGRATION = path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations', '025-pedido-origen-venta-directa.sql');

describe('migracion 025-pedido-origen-venta-directa', () => {
  test('el archivo existe', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('agrega columna origen con default mesa y check de valores', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/ADD COLUMN origen/i);
    expect(sql).toMatch(/DEFAULT 'mesa'/i);
    expect(sql).toMatch(/chk_pedido_origen/i);
    expect(sql).toContain(`'venta_directa'`);
    expect(sql).toContain(`'mostrador'`);
  });

  test('es idempotente (IF NOT EXISTS / CREATE INDEX IF NOT EXISTS)', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/IF NOT EXISTS/i);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS/i);
  });

  test('no contiene DROP ni DELETE destructivos', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/DROP COLUMN/i);
    expect(sql).not.toMatch(/DELETE FROM/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });
});
