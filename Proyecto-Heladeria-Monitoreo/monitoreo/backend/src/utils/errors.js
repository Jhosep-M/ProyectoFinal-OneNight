class AppError extends Error {
  constructor(status, error, detail) {
    super(detail ? `${error}: ${detail}` : error);
    this.status = status;
    this.error = error;
    this.detail = detail;
  }
}

module.exports = { AppError };
