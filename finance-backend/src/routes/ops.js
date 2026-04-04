const { Router } = require('express');
const { getDb } = require('../models/db');
const { authenticate } = require('../middleware/authenticate');
const { authorizeMinRole } = require('../middleware/authorize');
const { badRequestError } = require('../utils/errors');
const { ok } = require('../utils/response');
const { getTelemetrySummary, getRecentRequests } = require('../utils/telemetry');

const router = Router();

router.use(authenticate, authorizeMinRole('analyst'));

router.get('/health', (req, res, next) => {
  try {
    getDb().prepare('SELECT 1 AS ok').get();

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version,
      memory_mb: {
        rss: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
        heap_used: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
        heap_total: Number((process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)),
      },
      db: {
        path: process.env.DB_PATH || './finance.db',
        reachable: true,
      },
    };

    ok(res, health);
  } catch (err) {
    next(err);
  }
});

router.get('/metrics', (req, res, next) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins,
        SUM(CASE WHEN role = 'analyst' THEN 1 ELSE 0 END) AS analysts,
        SUM(CASE WHEN role = 'viewer' THEN 1 ELSE 0 END) AS viewers
      FROM users
    `).get();

    const transactions = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS soft_deleted,
        SUM(CASE WHEN type = 'income'  AND deleted_at IS NULL THEN amount ELSE 0 END) AS income_total,
        SUM(CASE WHEN type = 'expense' AND deleted_at IS NULL THEN amount ELSE 0 END) AS expense_total,
        SUM(CASE WHEN date = date('now') AND deleted_at IS NULL THEN 1 ELSE 0 END) AS created_today
      FROM transactions
    `).get();

    const telemetry = getTelemetrySummary();

    ok(res, {
      telemetry,
      data_shape: {
        users,
        transactions,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/activity', (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      throw badRequestError('limit must be between 1 and 100');
    }

    ok(res, getRecentRequests(limit));
  } catch (err) {
    next(err);
  }
});

router.get('/rbac', (req, res) => {
  ok(res, [
    { endpoint: 'POST /auth/login', viewer: true, analyst: true, admin: true },
    { endpoint: 'GET /transactions', viewer: true, analyst: true, admin: true },
    { endpoint: 'POST /transactions', viewer: false, analyst: false, admin: true },
    { endpoint: 'GET /dashboard/summary', viewer: true, analyst: true, admin: true },
    { endpoint: 'GET /dashboard/categories', viewer: false, analyst: true, admin: true },
    { endpoint: 'GET /users', viewer: false, analyst: false, admin: true },
    { endpoint: 'GET /ops/metrics', viewer: false, analyst: true, admin: true },
    { endpoint: 'POST /ai/chat', viewer: true, analyst: true, admin: true },
  ]);
});

module.exports = router;