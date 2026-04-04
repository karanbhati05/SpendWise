const request = require('supertest');
const path    = require('path');

// Use a separate in-memory test DB
process.env.DB_PATH   = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV   = 'test';

const app = require('../src/app');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerUser(overrides = {}) {
  return request(app).post('/auth/register').send({
    name: 'Test User', email: 'test@example.com', password: 'Password1!', ...overrides,
  });
}

async function loginUser(email = 'test@example.com', password = 'Password1!') {
  return request(app).post('/auth/login').send({ email, password });
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  test('creates a user and returns a token', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  test('rejects duplicate email', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  test('rejects weak password', async () => {
    const res = await registerUser({ password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('rejects invalid email', async () => {
    const res = await registerUser({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => { await registerUser(); });

  test('returns token on valid credentials', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  test('rejects wrong password', async () => {
    const res = await loginUser('test@example.com', 'WrongPass1!');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test('rejects unknown email', async () => {
    const res = await loginUser('nobody@example.com', 'Password1!');
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  test('returns profile when authenticated', async () => {
    await registerUser();
    const { body: { data: { token } } } = await loginUser();
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
  });

  test('rejects missing token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects malformed token', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });
});
