'use strict';

/* HU-04/HU-11 — Migracion 022: rol cocina + permiso pedido.estado.
 * Idempotente, sin DROP/DELETE. Sin DB real: fija el contenido del .sql.
 */

const fs = require('fs');
const path = require('path');

const MIGRATION = path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations', '022-cocina-mesero-estado.sql');

describe('migracion 022-cocina-mesero-estado', () => {
  test('el archivo existe', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('crea rol cocina y permiso pedido.estado de forma idempotente', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toContain(`'cocina'`);
    expect(sql).toContain(`'pedido.estado'`);
    expect(sql).toMatch(/ON CONFLICT\s*\(nombre\)\s*DO NOTHING/i);
  });

  test('otorga cocina solo consultar + estado (sin venta.* ni gestionar)', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM rol_permiso/i);
    expect(sql).not.toMatch(/venta\.crear/);
    expect(sql).not.toMatch(/pedido\.gestionar/);
  });

  test('no contiene DROP ni DELETE destructivos', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/DROP FUNCTION/i);
    expect(sql).not.toMatch(/DELETE FROM/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });
});
