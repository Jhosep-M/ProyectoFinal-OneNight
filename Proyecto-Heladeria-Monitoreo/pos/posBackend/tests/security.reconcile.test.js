'use strict';

/* Persona 4 — Reconciliacion 002: la DB viva nunca aplico 002-p4-security.sql
 * (los roles/permisos vinieron de otro seed). Esta migracion aplica lo que
 * falta de 002 sin romper nada existente.
 */

const fs = require('fs');
const path = require('path');

<<<<<<< HEAD
const MIGRATION = path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations', '004-p4-reconcile-002.sql');
=======
const MIGRATION = path.join(__dirname, '..', 'migrations', '004-p4-reconcile-002.sql');
>>>>>>> origin/feature/Airton-auxilio

describe('migracion 004-p4-reconcile-002', () => {
  test('el archivo existe', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('permite alertas externas sin turno (turno_id nullable)', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/ALTER TABLE[^;]*alerta_pos[^;]*ALTER COLUMN turno_id DROP NOT NULL/is);
  });

  test('no contiene DROP ni CREATE TABLE destructivos', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/DROP FUNCTION/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });
});
