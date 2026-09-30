const { createProductSchema, updateProductSchema } = require('../src/validators/product');
const { isUniqueViolation } = require('../src/utils/dbErrors');

describe('Step1 fix descripcion fantasma', () => {
  it('stripa descripcion (no existe columna en DB)', () => {
    const p = createProductSchema.parse({ nombre: 'X', precio: 5, descripcion: 'ignorar' });
    expect('descripcion' in p).toBe(false);
  });

  it('update stripa descripcion', () => {
    const p = updateProductSchema.parse({ descripcion: 'ignorar', precio: 6 });
    expect('descripcion' in p).toBe(false);
    expect(p.precio).toBe(6);
  });
});

describe('Step1 fix 409 duplicado', () => {
  it('detecta SequelizeUniqueConstraintError y 23505 en parent/original', () => {
    expect(isUniqueViolation({ name: 'SequelizeUniqueConstraintError', parent: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ original: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ parent: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation(Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' }))).toBe(true);
    expect(isUniqueViolation(new Error('otra cosa'))).toBe(false);
  });
});
