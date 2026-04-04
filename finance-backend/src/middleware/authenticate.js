const jwt = require('jsonwebtoken');
const { getDb } = require('../models/db');
const { unauthorizedError } = require('../utils/errors');

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the full user record to req.user on success.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorizedError('Missing or malformed Authorization header'));
  }

  const token = header.slice(7);
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return next(unauthorizedError(msg));
  }

  const user = getDb()
    .prepare('SELECT id, name, email, role, status FROM users WHERE id = ?')
    .get(payload.sub);

  if (!user) return next(unauthorizedError('User not found'));
  if (user.status === 'inactive') return next(unauthorizedError('Account is inactive'));

  req.user = user;
  next();
}

module.exports = { authenticate };
