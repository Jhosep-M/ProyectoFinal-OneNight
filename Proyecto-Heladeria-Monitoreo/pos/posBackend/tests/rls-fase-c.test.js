'use strict';

/* Fase C — RLS: la migración 010 versiona la sobrecarga de 1 arg, habilita
 * RLS en todas las tablas POS y crea policies documentadas sin USING(true).
 * Sin DB real: fija el contenido del .sql.
 */

const fs = require('fs');
const path = require('path');

const MIGRATION = path.join(__dirname, '..', '..', '..', 'database', 'pos', 'migrations', '010-fase-c-rls.sql');

const TABLES = [
  'usuario', 'rol', 'permiso', 'rol_permiso', 'turno_caja', 'venta', 'detalle_venta',
  'pago', 'metodo_pago', 'mesa', 'pedido', 'detalle_pedido', 'producto', 'categoria',
  'insumo', 'receta_insumo', 'proveedor', 'movimiento_inventario', 'promocion',
  'promocion_producto', 'devolucion', 'consumo_reportado', 'cola_integracion',
  'entrega_alerta', 'auditoria_accion', 'equipo_consumo', 'equipo_turno',
  'configuracion_pos', 'cliente', 'movimiento_puntos', 'alerta_pos',
];

const POLICIES = [
  'producto_select', 'producto_insert', 'producto_update',
  'movimiento_inventario_select', 'movimiento_inventario_insert',
  'venta_select', 'venta_insert',
  'turno_select', 'turno_insert',
  'auditoria_select',
];

describe('migracion 010-fase-c-rls', () => {
  test('el archivo existe', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('versiona la sobrecarga de 1 arg con auth.uid() y search_path fijo', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/usuario_tiene_permiso\(p_permiso TEXT\)/i);
    expect(sql).toMatch(/auth\.uid\(\)/);
    expect(sql).toMatch(/SECURITY DEFINER/i);
    expect(sql).toMatch(/search_path\s*=\s*public/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.usuario_tiene_permiso\(text\) FROM PUBLIC, anon/i);
  });

  test('habilita RLS en todas las tablas POS', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    for (const t of TABLES) {
      expect(sql).toContain(`'${t}'`);
    }
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  test('crea las policies documentadas de forma idempotente', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    for (const p of POLICIES) {
      expect(sql).toContain(p);
    }
    expect(sql).toMatch(/DROP POLICY IF EXISTS/);
  });

  test('sin USING(true) ni destructivos', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });
});
