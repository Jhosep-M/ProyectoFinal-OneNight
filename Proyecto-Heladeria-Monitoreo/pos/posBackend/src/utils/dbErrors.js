function isUniqueViolation(e) {
  if (!e) return false;
  if (e.name === 'SequelizeUniqueConstraintError') return true;
  const codes = [e.code, e.original?.code, e.parent?.code];
  if (codes.includes('23505')) return true;
  return /duplicate|unique/i.test(e.message || '');
}

module.exports = { isUniqueViolation };
