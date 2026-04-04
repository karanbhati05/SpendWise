const { getDb } = require('../models/db');
const { notFoundError, conflictError } = require('../utils/errors');

const SAFE_FIELDS = 'id, name, email, role, status, created_at, updated_at';

function listUsers({ page = 1, limit = 20 } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const data  = db.prepare(`SELECT ${SAFE_FIELDS} FROM users LIMIT ? OFFSET ?`).all(limit, offset);
  return { data, total, page, limit };
}

function getUserById(id) {
  const user = getDb()
    .prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`)
    .get(id);
  if (!user) throw notFoundError(`User ${id} not found`);
  return user;
}

function updateUser(id, fields) {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) throw notFoundError(`User ${id} not found`);

  if (fields.email) {
    const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(fields.email, id);
    if (conflict) throw conflictError('Email already in use');
  }

  const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values     = [...Object.values(fields), id];

  db.prepare(`UPDATE users SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  return getUserById(id);
}

function deleteUser(id, requesterId) {
  const db = getDb();
  if (id === requesterId) throw notFoundError('Cannot delete your own account');
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) throw notFoundError(`User ${id} not found`);
  return { deleted: true };
}

module.exports = { listUsers, getUserById, updateUser, deleteUser };
