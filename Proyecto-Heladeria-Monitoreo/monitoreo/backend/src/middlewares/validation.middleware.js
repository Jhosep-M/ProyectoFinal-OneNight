function parsear(res, resultado) {
  if (resultado.success) return null;
  res.status(400).json({
    error: 'Payload inválido',
    detail: resultado.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
  return true;
}

function validateBody(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (parsear(res, r)) return;
    req.body = r.data; // strip de campos extra
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.query);
    if (parsear(res, r)) return;
    req.query = r.data;
    next();
  };
}

module.exports = { validateBody, validateQuery };
