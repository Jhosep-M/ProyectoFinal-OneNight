import { describe, it, expect } from 'vitest';
import { getTiendaConfig } from '../tienda.js';

describe('getTiendaConfig', () => {
  it('devuelve nombre del local sin NIT', () => {
    const cfg = getTiendaConfig();
    expect(cfg.nombre.length).toBeGreaterThan(0);
    expect(cfg).not.toHaveProperty('nit');
  });
});
