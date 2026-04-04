const { Router } = require('express');
const { register, login, getProfile } = require('../services/authService');
const { authenticate } = require('../middleware/authenticate');
const { registerSchema, loginSchema, validate } = require('../validators');
const { ok, created } = require('../utils/response');

const router = Router();

/**
 * POST /auth/register
 * Body: { name, email, password, role? }
 * Public — creates a new user account.
 * Note: In production, role assignment should require admin privileges.
 *       Here it's open for demo convenience (documented in README assumptions).
 */
router.post('/register', (req, res, next) => {
  try {
    const input  = validate(registerSchema, req.body);
    const result = register(input);
    created(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 * Returns: { user, token }
 */
router.post('/login', (req, res, next) => {
  try {
    const input  = validate(loginSchema, req.body);
    const result = login(input);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Authenticated — returns the current user's profile.
 */
router.get('/me', authenticate, (req, res, next) => {
  try {
    const user = getProfile(req.user.id);
    ok(res, user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
