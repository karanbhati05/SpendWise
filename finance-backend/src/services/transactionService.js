const { getDb } = require('../models/db');
const { notFoundError, badRequestError } = require('../utils/errors');

const TX_FIELDS = `
  t.id, t.user_id, t.amount, t.type,
  t.category_id, c.name AS category_name,
  t.date, t.notes, t.created_at, t.updated_at
`;

function listTransactions({ type, category_id, date_from, date_to, page, limit, sort, order } = {}) {
  const db = getDb();
  const conditions = ['t.deleted_at IS NULL'];
  const params     = [];

  if (type)        { conditions.push('t.type = ?');        params.push(type); }
  if (category_id) { conditions.push('t.category_id = ?'); params.push(category_id); }
  if (date_from)   { conditions.push('t.date >= ?');        params.push(date_from); }
  if (date_to)     { conditions.push('t.date <= ?');        params.push(date_to); }

  const where  = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  // Allowlist sort columns to prevent SQL injection
  const ALLOWED_SORT = { date: 't.date', amount: 't.amount', created_at: 't.created_at' };
  const sortCol = ALLOWED_SORT[sort] ?? 't.date';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  const total = db
    .prepare(`SELECT COUNT(*) as n FROM transactions t WHERE ${where}`)
    .get(...params).n;

  const data = db.prepare(`
    SELECT ${TX_FIELDS}
    FROM   transactions t
    LEFT   JOIN categories c ON c.id = t.category_id
    WHERE  ${where}
    ORDER  BY ${sortCol} ${sortDir}
    LIMIT  ? OFFSET ?
  `).all(...params, limit, offset);

  return { data, total, page, limit };
}

function getTransactionById(id) {
  const tx = getDb().prepare(`
    SELECT ${TX_FIELDS}
    FROM   transactions t
    LEFT   JOIN categories c ON c.id = t.category_id
    WHERE  t.id = ? AND t.deleted_at IS NULL
  `).get(id);

  if (!tx) throw notFoundError(`Transaction ${id} not found`);
  return tx;
}

function createTransaction(userId, fields) {
  const db = getDb();
  validateCategoryExists(db, fields.category_id);

  const result = db.prepare(`
    INSERT INTO transactions (user_id, amount, type, category_id, date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, fields.amount, fields.type, fields.category_id ?? null, fields.date, fields.notes ?? null);

  return getTransactionById(result.lastInsertRowid);
}

function updateTransaction(id, fields) {
  const db = getDb();
  const tx = db.prepare('SELECT id FROM transactions WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!tx) throw notFoundError(`Transaction ${id} not found`);

  if (fields.category_id !== undefined) validateCategoryExists(db, fields.category_id);

  const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values     = [...Object.values(fields), id];

  db.prepare(
    `UPDATE transactions SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`
  ).run(...values);

  return getTransactionById(id);
}

function deleteTransaction(id) {
  const db = getDb();
  const tx = db.prepare('SELECT id FROM transactions WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!tx) throw notFoundError(`Transaction ${id} not found`);

  db.prepare(`UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  return { deleted: true, id };
}

function listCategories() {
  return getDb().prepare('SELECT * FROM categories ORDER BY name').all();
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function validateCategoryExists(db, categoryId) {
  if (!categoryId) return;
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
  if (!cat) throw badRequestError(`Category ${categoryId} does not exist`);
}

module.exports = {
  listTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listCategories,
};
