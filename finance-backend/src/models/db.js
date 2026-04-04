const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const IS_VERCEL = Boolean(process.env.VERCEL);
const DB_PATH = process.env.DB_PATH || (IS_VERCEL ? '/tmp/finance.db' : './finance.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(path.resolve(DB_PATH));
    db.pragma(IS_VERCEL ? 'journal_mode = MEMORY' : 'journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    bootstrapDemoData(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','analyst','admin')),
      status      TEXT    NOT NULL DEFAULT 'active'  CHECK(status IN ('active','inactive')),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      amount      REAL    NOT NULL CHECK(amount > 0),
      type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
      category_id INTEGER REFERENCES categories(id),
      date        TEXT    NOT NULL,
      notes       TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      deleted_at  TEXT    DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date       ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type       ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category   ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);
  `);
}

function bootstrapDemoData(db) {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (!userCount) {
    const insertUser = db.prepare('INSERT INTO users(name,email,password,role,status) VALUES(?,?,?,?,?)');
    insertUser.run('Arjun Mehta', 'admin@finance.dev', bcrypt.hashSync('Admin123!', 10), 'admin', 'active');
    insertUser.run('Rohan Iyer', 'analyst@finance.dev', bcrypt.hashSync('Analyst123!', 10), 'analyst', 'active');
    insertUser.run('Ananya Pillai', 'viewer@finance.dev', bcrypt.hashSync('Viewer123!', 10), 'viewer', 'active');
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (!categoryCount) {
    const categories = [
      'Salary', 'Freelance', 'Investments', 'Food & Dining', 'Rent', 'Utilities', 'Healthcare',
      'Entertainment', 'Travel', 'Shopping', 'Education', 'Fuel', 'EMI / Loans', 'Insurance',
      'Groceries', 'Personal Care', 'Subscriptions', 'Misc'
    ];
    const insertCategory = db.prepare('INSERT INTO categories(name) VALUES(?)');
    categories.forEach((name) => insertCategory.run(name));
  }

  const txCount = db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
  if (!txCount) {
    const admin = db.prepare("SELECT id FROM users WHERE email = 'admin@finance.dev'").get();
    if (!admin) return;

    const catRows = db.prepare('SELECT id, name FROM categories').all();
    const catByName = Object.fromEntries(catRows.map((c) => [c.name, c.id]));
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');

    const txs = [
      { amount: 85000, type: 'income', category: 'Salary',       date: `${y}-${m}-01`, notes: 'Monthly salary' },
      { amount: 28000, type: 'expense', category: 'Rent',        date: `${y}-${m}-03`, notes: 'House rent' },
      { amount: 6200,  type: 'expense', category: 'Groceries',   date: `${y}-${m}-06`, notes: 'Groceries and essentials' },
      { amount: 3200,  type: 'expense', category: 'Utilities',   date: `${y}-${m}-08`, notes: 'Electricity and internet' },
      { amount: 4500,  type: 'income', category: 'Investments',  date: `${y}-${m}-10`, notes: 'Dividend and gains' },
      { amount: 2400,  type: 'expense', category: 'Food & Dining', date: `${y}-${m}-12`, notes: 'Dining out' },
    ];

    const insertTx = db.prepare(
      'INSERT INTO transactions(user_id,amount,type,category_id,date,notes) VALUES(?,?,?,?,?,?)'
    );

    txs.forEach((t) => {
      insertTx.run(admin.id, t.amount, t.type, catByName[t.category] || null, t.date, t.notes);
    });
  }
}

module.exports = { getDb };
