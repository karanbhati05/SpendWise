const { Router } = require('express');
const { listUsers, getUserById, updateUser, deleteUser } = require('../services/userService');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { updateUserSchema, validate } = require('../validators');
const { ok, paginated } = require('../utils/response');

const router = Router();

// All user management routes require authentication + admin role
router.use(authenticate, authorize('admin'));

/**
 * GET /users
 * Query: ?page=1&limit=20
 */
router.get('/', (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const result = listUsers({ page, limit });
    paginated(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /users/:id
 */
router.get('/:id', (req, res, next) => {
  try {
    const user = getUserById(parseInt(req.params.id));
    ok(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /users/:id
 * Body: { name?, role?, status? }
 */
router.patch('/:id', (req, res, next) => {
  try {
    const fields = validate(updateUserSchema, req.body);
    const user   = updateUser(parseInt(req.params.id), fields);
    ok(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /users/:id
 * Hard deletes the user (admin cannot delete themselves).
 */
router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteUser(parseInt(req.params.id), req.user.id);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
