'use strict';

/* Fase B — RBAC: la migración 008 siembra todos los permisos que las rutas
 * exigen (incluido turno.cerrar.todos de cerrar_turno Fase A) y los grants
 * por rol. Idempotente. Sin DB real: fija el contenido del .sql.
 */

const fs = require('fs');
const path = require('path');

const MIGRATION = path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations', '008-fase-b-rbac.sql');

const PERMISOS = [
  'venta.consultar',
  'turno.consultar',
  'turno.consultar.todos',
  'turno.cerrar.todos',
  'producto.consultar',
  'producto.gestionar',
  'inventario.consultar',
  'inventario.movimiento',
  'cliente.consultar',
  'cliente.gestionar',
  'promocion.consultar',
  'promocion.gestionar',
  'configuracion.consultar',
  'configuracion.gestionar',
  'auditoria.consultar',
  'usuario.consultar',
  'usuario.gestionar',
];

const ROLES = ['cajero', 'mesero', 'inventario', 'supervisor', 'admin'];

describe('migracion 008-fase-b-rbac', () => {
  test('el archivo existe', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('siembra todos los permisos Fase B de forma idempotente', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    for (const p of PERMISOS) {
      expect(sql).toContain(`'${p}'`);
    }
    expect(sql).toMatch(/ON CONFLICT\s*\(nombre\)\s*DO NOTHING/i);
  });

  test('otorga permisos a los 5 roles sin duplicar', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    for (const r of ROLES) {
      expect(sql).toContain(`'${r}'`);
    }
    expect(sql).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM rol_permiso/si);
  });

  test('no contiene DROP ni DELETE destructivos', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/DROP FUNCTION/i);
    expect(sql).not.toMatch(/DELETE FROM/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });
});
