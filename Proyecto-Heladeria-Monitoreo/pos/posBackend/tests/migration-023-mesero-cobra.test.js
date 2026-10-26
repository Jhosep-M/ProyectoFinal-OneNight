'use strict';

/* Opción A: migración 023 otorga a mesero venta.crear + pago.consultar
 * (cobrar sobre turno de caja, sin abrir/cerrar/consultar turnos).
 * Idempotente, sin DROP/DELETE.
 */

const fs = require('fs');
const path = require('path');

const MIGRATION = path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations', '023-mesero-cobra.sql');

describe('migracion 023-mesero-cobra', () => {
  test('el archivo existe', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('otorga venta.crear y pago.consultar a mesero sin duplicar', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toContain(`'venta.crear'`);
    expect(sql).toContain(`'pago.consultar'`);
    expect(sql).toContain(`'mesero'`);
    expect(sql).toMatch(/ON CONFLICT\s*\(nombre\)\s*DO NOTHING/i);
    expect(sql).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM rol_permiso/si);
  });

  test('no otorga turno.abrir/cerrar ni venta.anular al mesero', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).not.toMatch(/turno\.abrir/);
    expect(sql).not.toMatch(/turno\.cerrar/);
    expect(sql).not.toMatch(/turno\.consultar/);
    expect(sql).not.toMatch(/venta\.anular/);
  });

  test('no contiene DROP ni DELETE destructivos', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/DROP FUNCTION/i);
    expect(sql).not.toMatch(/DELETE FROM/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });
});
