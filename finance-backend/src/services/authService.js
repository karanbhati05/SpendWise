const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../models/db');
const { conflictError, unauthorizedError, notFoundError } = require('../utils/errors');

const SALT_ROUNDS = 10;

function generateToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function register({ name, email, password, role }) {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw conflictError('An account with this email already exists');

  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = db
    .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hash, role ?? 'viewer');

  const user = db
    .prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  return { user, token: generateToken(user) };
}

function login({ email, password }) {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) throw unauthorizedError('Invalid email or password');
  if (user.status === 'inactive') throw unauthorizedError('Account is inactive');

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) throw unauthorizedError('Invalid email or password');

  const { password: _, ...safeUser } = user;
  return { user: safeUser, token: generateToken(safeUser) };
}

function getProfile(userId) {
  const user = getDb()
    .prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?')
    .get(userId);
  if (!user) throw notFoundError('User not found');
  return user;
}

module.exports = { register, login, getProfile };
