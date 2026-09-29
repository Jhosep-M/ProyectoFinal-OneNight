'use strict';

/* Persona 4 — Convencion de migraciones: la ubicacion canonica es
 * database/pos/migrations/ (ahi viven el trabajo activo y los tests que
 * fijan su contenido).
 */

const fs = require('fs');
const path = require('path');

const CANONICAL_MIGRATIONS = path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations');

describe('convencion de migraciones', () => {
  test('migraciones canonicas existen', () => {
    const archivos = fs.readdirSync(CANONICAL_MIGRATIONS).filter((f) => f.endsWith('.sql'));
    expect(archivos.length).toBeGreaterThan(0);
  });

  test('toda migracion canonica nueva tiene test que fija su contenido', () => {
    const canonicas = fs.readdirSync(CANONICAL_MIGRATIONS).filter((f) => f.endsWith('.sql'));
    const tests = fs.readdirSync(__dirname).join('\n');
    for (const m of ['003-p4-authorize-seeds.sql', '004-p4-reconcile-002.sql']) {
      expect(canonicas).toContain(m);
      expect(tests).toMatch(/security\.(rbac-seeds|reconcile)\.test\.js/);
    }
  });
});
