const { forbiddenError } = require('../utils/errors');

const ROLE_HIERARCHY = { viewer: 1, analyst: 2, admin: 3 };

/**
 * authorize(...roles) — returns middleware that allows access only if
 * req.user.role is one of the specified roles.
 *
 * Usage:
 *   router.post('/transactions', authenticate, authorize('admin'), handler)
 *   router.get('/dashboard/trends', authenticate, authorize('analyst', 'admin'), handler)
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(forbiddenError('Authentication required'));
    }

    const allowed = roles.some(role => req.user.role === role);
    if (!allowed) {
      return next(
        forbiddenError(
          `Role '${req.user.role}' is not permitted to perform this action. Required: ${roles.join(' or ')}`
        )
      );
    }

    next();
  };
}

/**
 * authorizeMinRole('analyst') — allows analyst AND admin (hierarchy-based).
 */
function authorizeMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return next(forbiddenError('Authentication required'));

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 99;

    if (userLevel < requiredLevel) {
      return next(
        forbiddenError(`Minimum role required: '${minRole}', your role: '${req.user.role}'`)
      );
    }

    next();
  };
}

module.exports = { authorize, authorizeMinRole };
