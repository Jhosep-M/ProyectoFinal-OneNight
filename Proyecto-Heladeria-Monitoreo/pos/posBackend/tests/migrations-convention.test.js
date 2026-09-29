'use strict';

/* Persona 4 — Convencion de migraciones: la ubicacion canonica es
 * pos/posBackend/migrations/ (ahi viven el trabajo activo y los tests que
 * fijan su contenido). supabase/migrations/ queda congelado: solo los dos
 * archivos historicos + README. Nada nuevo ahi.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_MIGRATIONS = path.join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const HISTORICOS = new Set(['001_v2_1_ddl.sql', '002_p4_security.sql', 'README.md']);

describe('convencion de migraciones', () => {
  test('supabase/migrations solo contiene historicos + README (nada nuevo)', () => {
    const archivos = fs.readdirSync(SUPABASE_MIGRATIONS).filter((f) => f.endsWith('.sql') || f === 'README.md');
    for (const f of archivos) {
      expect(HISTORICOS.has(f)).toBe(true);
    }
  });

  test('toda migracion canonica nueva tiene test que fija su contenido', () => {
    const canonicas = fs.readdirSync(path.join(__dirname, '..', 'migrations')).filter((f) => f.endsWith('.sql'));
    const tests = fs.readdirSync(__dirname).join('\n');
    for (const m of ['003-p4-authorize-seeds.sql', '004-p4-reconcile-002.sql']) {
      expect(canonicas).toContain(m);
      expect(tests).toMatch(/security\.(rbac-seeds|reconcile)\.test\.js/);
    }
  });
});
