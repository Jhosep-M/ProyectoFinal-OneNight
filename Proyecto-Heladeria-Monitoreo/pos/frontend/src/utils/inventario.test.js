import { describe, it, expect } from 'vitest';
import { isStockBajo, isVencido, isPorVencer, getAlertaInsumo } from './inventario.js';

describe('inventario helpers', () => {
  it('detecta stock bajo cuando stock <= minimo', () => {
    expect(isStockBajo({ stock: 5, stock_minimo: 10 })).toBe(true);
    expect(isStockBajo({ stock: 10, stock_minimo: 10 })).toBe(true);
    expect(isStockBajo({ stock: 11, stock_minimo: 10 })).toBe(false);
  });

  it('detecta vencido cuando fecha_vencimiento < hoy', () => {
    expect(isVencido({ fecha_vencimiento: '2020-01-01' })).toBe(true);
    expect(isVencido({ fecha_vencimiento: null })).toBe(false);
    expect(isVencido({})).toBe(false);
  });

  it('detecta por vencer dentro de 7 dias', () => {
    const en3 = new Date(Date.now() + 3 * 86400000).toISOString();
    const en30 = new Date(Date.now() + 30 * 86400000).toISOString();
    expect(isPorVencer({ fecha_vencimiento: en3 })).toBe(true);
    expect(isPorVencer({ fecha_vencimiento: en30 })).toBe(false);
    expect(isPorVencer({ fecha_vencimiento: '2020-01-01' })).toBe(false);
  });

  it('prioriza alerta vencido sobre stock bajo', () => {
    const a = getAlertaInsumo({ stock: 1, stock_minimo: 10, fecha_vencimiento: '2020-01-01' });
    expect(a).toBe('vencido');
  });

  it('retorna stock-bajo cuando corresponde', () => {
    expect(getAlertaInsumo({ stock: 2, stock_minimo: 5 })).toBe('stock-bajo');
  });

  it('retorna null cuando todo esta bien', () => {
    const futuro = new Date(Date.now() + 60 * 86400000).toISOString();
    expect(getAlertaInsumo({ stock: 100, stock_minimo: 5, fecha_vencimiento: futuro, estado: 'disponible' })).toBe(null);
  });
});
