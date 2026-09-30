import { describe, it, expect } from 'vitest';
import { calcularPorciones, calcularCosto, validarCantidad } from '../receta.js';

describe('receta utils', () => {
  it('porciones = min(stock/cantidad)', () => {
    expect(
      calcularPorciones([
        { stock: 1000, cantidad_requerida: 100 },
        { stock: 500, cantidad_requerida: 50 },
      ]),
    ).toBe(10);
  });

  it('porciones 0 si receta vacía o cantidad inválida', () => {
    expect(calcularPorciones([])).toBe(0);
    expect(calcularPorciones([{ stock: 100, cantidad_requerida: 0 }])).toBe(0);
  });

  it('costo suma cantidades', () => {
    expect(calcularCosto([{ cantidad_requerida: 2, costo_unitario: 3 }])).toBe(6);
  });

  it('rechaza cantidad <=0', () => {
    expect(validarCantidad(0)).toBe('Cantidad debe ser > 0');
    expect(validarCantidad(-5)).toBe('Cantidad debe ser > 0');
    expect(validarCantidad(10)).toBe(null);
  });
});
