function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

function okList(res, data, extra = {}) {
  return res.status(200).json({ data, ...extra });
}

function fail(res, status, error, detail) {
  return res.status(status).json(detail ? { error, detail } : { error });
}

module.exports = { ok, okList, fail };
