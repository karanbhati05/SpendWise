const request = require('supertest');

process.env.DB_PATH    = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV   = 'test';

const app = require('../src/app');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createAndLogin(role) {
  const email = `${role}@test.com`;
  await request(app).post('/auth/register').send({
    name: `${role} user`, email, password: 'Password1!', role,
  });
  const res = await request(app).post('/auth/login').send({ email, password: 'Password1!' });
  return res.body.data.token;
}

const sampleTx = {
  amount: 1500,
  type: 'income',
  date: '2024-03-15',
  notes: 'Test transaction',
};

// ─── Transaction CRUD ─────────────────────────────────────────────────────────

describe('Transaction CRUD', () => {
  let adminToken, analystToken, viewerToken;

  beforeEach(async () => {
    adminToken   = await createAndLogin('admin');
    analystToken = await createAndLogin('analyst');
    viewerToken  = await createAndLogin('viewer');
  });

  test('admin can create a transaction', async () => {
    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(sampleTx);
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(1500);
    expect(res.body.data.type).toBe('income');
  });

  test('analyst cannot create a transaction', async () => {
    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${analystToken}`)
      .send(sampleTx);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('viewer cannot create a transaction', async () => {
    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(sampleTx);
    expect(res.status).toBe(403);
  });

  test('all roles can list transactions', async () => {
    for (const token of [adminToken, analystToken, viewerToken]) {
      const res = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
    }
  });

  test('admin can update a transaction', async () => {
    const create = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(sampleTx);
    const id = create.body.data.id;

    const res = await request(app)
      .patch(`/transactions/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 2000, notes: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(2000);
    expect(res.body.data.notes).toBe('Updated');
  });

  test('admin can soft-delete a transaction', async () => {
    const create = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(sampleTx);
    const id = create.body.data.id;

    const del = await request(app)
      .delete(`/transactions/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    expect(del.body.data.deleted).toBe(true);

    // Should no longer be retrievable
    const get = await request(app)
      .get(`/transactions/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(get.status).toBe(404);
  });

  test('rejects transaction with negative amount', async () => {
    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...sampleTx, amount: -100 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('rejects invalid date format', async () => {
    const res = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...sampleTx, date: '15-03-2024' });
    expect(res.status).toBe(400);
  });

  test('filtering by type returns correct records', async () => {
    await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...sampleTx, type: 'income' });
    await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...sampleTx, type: 'expense' });

    const res = await request(app)
      .get('/transactions?type=income')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every(t => t.type === 'income')).toBe(true);
  });
});

// ─── Dashboard RBAC ───────────────────────────────────────────────────────────

describe('Dashboard RBAC', () => {
  let adminToken, analystToken, viewerToken;

  beforeEach(async () => {
    adminToken   = await createAndLogin('admin');
    analystToken = await createAndLogin('analyst');
    viewerToken  = await createAndLogin('viewer');
  });

  test('all roles can access /dashboard/summary', async () => {
    for (const token of [adminToken, analystToken, viewerToken]) {
      const res = await request(app).get('/dashboard/summary').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('net_balance');
    }
  });

  test('viewer cannot access /dashboard/trends/monthly', async () => {
    const res = await request(app)
      .get('/dashboard/trends/monthly')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  test('analyst can access /dashboard/trends/monthly', async () => {
    const res = await request(app)
      .get('/dashboard/trends/monthly')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('admin can access /dashboard/categories', async () => {
    const res = await request(app)
      .get('/dashboard/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
