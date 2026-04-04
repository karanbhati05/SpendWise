const { Router } = require('express');
const {
  listTransactions, getTransactionById, createTransaction,
  updateTransaction, deleteTransaction, listCategories,
} = require('../services/transactionService');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const {
  transactionSchema, updateTransactionSchema, transactionQuerySchema, validate,
} = require('../validators');
const { ok, created, paginated } = require('../utils/response');

const router = Router();

// All transaction routes require authentication
router.use(authenticate);

/**
 * GET /transactions/categories
 * Accessible by all roles.
 */
router.get('/categories', (req, res, next) => {
  try {
    ok(res, listCategories());
  } catch (err) {
    next(err);
  }
});

/**
 * GET /transactions
 * Query: type, category_id, date_from, date_to, page, limit, sort, order
 * Accessible by all roles.
 */
router.get('/', (req, res, next) => {
  try {
    const query  = validate(transactionQuerySchema, req.query);
    const result = listTransactions(query);
    paginated(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /transactions/:id
 * Accessible by all roles.
 */
router.get('/:id', (req, res, next) => {
  try {
    const tx = getTransactionById(parseInt(req.params.id));
    ok(res, tx);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /transactions
 * Admin only.
 */
router.post('/', authorize('admin'), (req, res, next) => {
  try {
    const fields = validate(transactionSchema, req.body);
    const tx     = createTransaction(req.user.id, fields);
    created(res, tx);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /transactions/:id
 * Admin only.
 */
router.patch('/:id', authorize('admin'), (req, res, next) => {
  try {
    const fields = validate(updateTransactionSchema, req.body);
    const tx     = updateTransaction(parseInt(req.params.id), fields);
    ok(res, tx);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /transactions/:id
 * Admin only. Soft-deletes the record.
 */
router.delete('/:id', authorize('admin'), (req, res, next) => {
  try {
    const result = deleteTransaction(parseInt(req.params.id));
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
