const { Router } = require('express');
const {
  getSummary, getCategoryBreakdown, getMonthlyTrends,
  getWeeklyTrends, getRecentActivity,
} = require('../services/summaryService');
const { authenticate } = require('../middleware/authenticate');
const { authorizeMinRole } = require('../middleware/authorize');
const { ok } = require('../utils/response');

const router = Router();

router.use(authenticate);

/**
 * GET /dashboard/summary
 * Query: date_from?, date_to?
 * All roles — high-level totals and counts.
 */
router.get('/summary', (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    ok(res, getSummary({ date_from, date_to }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /dashboard/recent
 * Query: limit? (default 10)
 * All roles — recent activity feed.
 */
router.get('/recent', (req, res, next) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    ok(res, getRecentActivity({ limit }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /dashboard/categories
 * Query: type?, date_from?, date_to?
 * Analyst + Admin — category-wise breakdowns.
 */
router.get('/categories', authorizeMinRole('analyst'), (req, res, next) => {
  try {
    const { type, date_from, date_to } = req.query;
    ok(res, getCategoryBreakdown({ type, date_from, date_to }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /dashboard/trends/monthly
 * Query: months? (default 6)
 * Analyst + Admin — monthly income vs expense trends.
 */
router.get('/trends/monthly', authorizeMinRole('analyst'), (req, res, next) => {
  try {
    const months = Math.min(24, parseInt(req.query.months) || 6);
    ok(res, getMonthlyTrends({ months }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /dashboard/trends/weekly
 * Analyst + Admin — week-by-week spending for the current month.
 */
router.get('/trends/weekly', authorizeMinRole('analyst'), (req, res, next) => {
  try {
    ok(res, getWeeklyTrends());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
