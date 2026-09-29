'use strict';

/* Persona 4 — RBAC: la migración 003 debe alinear la DB con el contrato que
 * el middleware authorize() ya usa: usuario_tiene_permiso(uid, permiso).
 * La DB viva tiene solo la sobrecarga de 1 arg con auth.uid(), que desde el
 * backend (conexion directa PG sin contexto JWT) siempre da false.
 */

const fs = require('fs');
const path = require('path');

<<<<<<< HEAD
const MIGRATION = path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations', '003-p4-authorize-seeds.sql');
=======
const MIGRATION = path.join(__dirname, '..', 'migrations', '003-p4-authorize-seeds.sql');
>>>>>>> origin/feature/Airton-auxilio

const PERMISOS_REQUERIDOS = [
  'pedido.consultar',
  'pedido.crear',
  'pedido.gestionar',
  'pago.consultar',
  'pago.gestionar',
  'devolucion.consultar',
  'devolucion.procesar',
  'mesa.consultar',
  'mesa.gestionar',
  'integracion.consultar',
  'integracion.gestionar',
  'alerta.recibir',
];

describe('migracion 003-p4-authorize-seeds', () => {
  test('el archivo existe', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('conserva la sobrecarga de 1 arg que usan las policies RLS (no DROP)', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).not.toMatch(/DROP FUNCTION[^;]*usuario_tiene_permiso/i);
  });

  test('define la funcion de 2 args con uid explicito (sin auth.uid)', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/usuario_tiene_permiso\(p_uid UUID,\s*p_permiso TEXT\)/i);
    expect(sql).toMatch(/u\.id_usuario\s*=\s*p_uid/);
    expect(sql).not.toMatch(/auth\.uid\(\)/);
    expect(sql).toMatch(/SECURITY DEFINER/i);
    expect(sql).toMatch(/search_path\s*=\s*public/i);
  });

  test('revoca EXECUTE de funciones criticas a PUBLIC/anon/authenticated', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    for (const fn of ['registrar_venta', 'anular_venta', 'procesar_devolucion', 'cerrar_turno']) {
      expect(sql).toMatch(new RegExp(`REVOKE[^;]*FUNCTION[^;]*${fn}[^;]*FROM PUBLIC`, 'is'));
    }
  });

  test('sembra todos los permisos que las rutas exigen (idempotente)', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    for (const p of PERMISOS_REQUERIDOS) {
      expect(sql).toContain(`'${p}'`);
    }
    expect(sql).toMatch(/ON CONFLICT\s*\(nombre\)\s*DO NOTHING/i);
  });

  test('otorga grants por rol sin duplicar', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM rol_permiso/i);
    // mesero y cajero operan pedidos; solo supervisor/admin gestionan
    expect(sql).toMatch(/pedido\.gestionar/);
  });
});
