class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

const badRequestError  = (msg) => new AppError(msg, 400, 'BAD_REQUEST');
const unauthorizedError = (msg) => new AppError(msg, 401, 'UNAUTHORIZED');
const forbiddenError   = (msg) => new AppError(msg, 403, 'FORBIDDEN');
const notFoundError    = (msg) => new AppError(msg, 404, 'NOT_FOUND');
const conflictError    = (msg) => new AppError(msg, 409, 'CONFLICT');

/**
 * Express error-handling middleware — must be registered last.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Zod validation errors
  if (err.name === 'ZodError') {
    const details = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
    return res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details,
    });
  }

  // Known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: true,
      code: err.code,
      message: err.message,
    });
  }

  // Unknown / programming errors — don't leak internals
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    error: true,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

module.exports = {
  AppError,
  badRequestError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  errorHandler,
};
