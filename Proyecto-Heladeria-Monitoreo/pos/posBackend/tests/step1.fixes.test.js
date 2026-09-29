<<<<<<< HEAD
const { createProductSchema, updateProductSchema } = require('../src/validators/product');
const { isUniqueViolation } = require('../src/utils/dbErrors');
=======
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createProductSchema, updateProductSchema } = require('../src/validators/product');
>>>>>>> origin/feature/Airton-auxilio

describe('Step1 fix descripcion fantasma', () => {
  it('stripa descripcion (no existe columna en DB)', () => {
    const p = createProductSchema.parse({ nombre: 'X', precio: 5, descripcion: 'ignorar' });
<<<<<<< HEAD
    expect('descripcion' in p).toBe(false);
=======
    assert.ok(!('descripcion' in p), 'parsed no debe incluir descripcion');
>>>>>>> origin/feature/Airton-auxilio
  });

  it('update stripa descripcion', () => {
    const p = updateProductSchema.parse({ descripcion: 'ignorar', precio: 6 });
<<<<<<< HEAD
    expect('descripcion' in p).toBe(false);
    expect(p.precio).toBe(6);
=======
    assert.ok(!('descripcion' in p), 'parsed no debe incluir descripcion');
    assert.equal(p.precio, 6);
>>>>>>> origin/feature/Airton-auxilio
  });
});

describe('Step1 fix 409 duplicado', () => {
  it('detecta SequelizeUniqueConstraintError y 23505 en parent/original', () => {
<<<<<<< HEAD
    expect(isUniqueViolation({ name: 'SequelizeUniqueConstraintError', parent: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ original: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ parent: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation(Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' }))).toBe(true);
    expect(isUniqueViolation(new Error('otra cosa'))).toBe(false);
=======
    const { isUniqueViolation } = require('../src/utils/dbErrors');
    assert.equal(isUniqueViolation({ name: 'SequelizeUniqueConstraintError', parent: { code: '23505' } }), true);
    assert.equal(isUniqueViolation({ original: { code: '23505' } }), true);
    assert.equal(isUniqueViolation({ parent: { code: '23505' } }), true);
    assert.equal(isUniqueViolation(Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' })), true);
    assert.equal(isUniqueViolation(new Error('otra cosa')), false);
>>>>>>> origin/feature/Airton-auxilio
  });
});
