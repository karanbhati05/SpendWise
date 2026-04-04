const { getDb } = require('../models/db');

/**
 * High-level financial summary: totals, net balance, record counts.
 * Computed in a single SQL query — no JS-side aggregation.
 */
function getSummary({ date_from, date_to } = {}) {
  const db = getDb();
  const { conditions, params } = buildDateConditions(date_from, date_to);
  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  const totals = db.prepare(`
    SELECT
      ROUND(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 2) AS total_income,
      ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) AS total_expenses,
      ROUND(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 2) AS net_balance,
      COUNT(*)                                                           AS total_records,
      COUNT(CASE WHEN type = 'income'  THEN 1 END)                      AS income_count,
      COUNT(CASE WHEN type = 'expense' THEN 1 END)                      AS expense_count
    FROM transactions
    WHERE deleted_at IS NULL ${where}
  `).get(...params);

  return {
    total_income:   totals.total_income   ?? 0,
    total_expenses: totals.total_expenses ?? 0,
    net_balance:    totals.net_balance    ?? 0,
    total_records:  totals.total_records  ?? 0,
    income_count:   totals.income_count   ?? 0,
    expense_count:  totals.expense_count  ?? 0,
    period: { date_from: date_from ?? null, date_to: date_to ?? null },
  };
}

/**
 * Category-wise breakdown of income and expenses.
 */
function getCategoryBreakdown({ type, date_from, date_to } = {}) {
  const db = getDb();
  const { conditions, params } = buildDateConditions(date_from, date_to);
  if (type) { conditions.push('t.type = ?'); params.push(type); }

  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  return db.prepare(`
    SELECT
      c.id               AS category_id,
      COALESCE(c.name, 'Uncategorized') AS category,
      t.type,
      COUNT(*)           AS count,
      ROUND(SUM(t.amount), 2) AS total,
      ROUND(AVG(t.amount), 2) AS average
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.deleted_at IS NULL ${where}
    GROUP BY t.category_id, t.type
    ORDER BY total DESC
  `).all(...params);
}

/**
 * Monthly aggregation for trend charts (last N months).
 * Returns one row per month per type.
 */
function getMonthlyTrends({ months = 6 } = {}) {
  const db = getDb();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months + 1);
  cutoff.setDate(1);
  const from = cutoff.toISOString().split('T')[0];

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      type,
      COUNT(*)                AS count,
      ROUND(SUM(amount), 2)   AS total
    FROM transactions
    WHERE deleted_at IS NULL AND date >= ?
    GROUP BY month, type
    ORDER BY month ASC
  `).all(from);

  // Pivot into { month, income, expenses, net }
  const map = {};
  for (const row of rows) {
    if (!map[row.month]) map[row.month] = { month: row.month, income: 0, expenses: 0, net: 0, income_count: 0, expense_count: 0 };
    if (row.type === 'income') {
      map[row.month].income        = row.total;
      map[row.month].income_count  = row.count;
    } else {
      map[row.month].expenses       = row.total;
      map[row.month].expense_count  = row.count;
    }
  }

  return Object.values(map).map(m => ({
    ...m,
    net: Math.round((m.income - m.expenses) * 100) / 100,
  }));
}

/**
 * Weekly spending for the current month.
 */
function getWeeklyTrends() {
  const db = getDb();
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const from = firstOfMonth.toISOString().split('T')[0];

  return db.prepare(`
    SELECT
      CAST((strftime('%d', date) - 1) / 7 AS INT) + 1 AS week,
      type,
      ROUND(SUM(amount), 2) AS total,
      COUNT(*)              AS count
    FROM transactions
    WHERE deleted_at IS NULL AND date >= ?
    GROUP BY week, type
    ORDER BY week ASC, type
  `).all(from);
}

/**
 * Most recent N transactions (for dashboard activity feed).
 */
function getRecentActivity({ limit = 10 } = {}) {
  return getDb().prepare(`
    SELECT
      t.id, t.amount, t.type,
      COALESCE(c.name, 'Uncategorized') AS category,
      t.date, t.notes, t.created_at
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.deleted_at IS NULL
    ORDER BY t.created_at DESC
    LIMIT ?
  `).all(limit);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildDateConditions(date_from, date_to) {
  const conditions = [];
  const params = [];
  if (date_from) { conditions.push('date >= ?'); params.push(date_from); }
  if (date_to)   { conditions.push('date <= ?'); params.push(date_to); }
  return { conditions, params };
}

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrends, getWeeklyTrends, getRecentActivity };
