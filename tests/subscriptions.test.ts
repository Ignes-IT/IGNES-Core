import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { resetDb } from './helpers/db';

const registerUser = async (email: string) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123' });
  return { token: res.body.token as string, id: res.body.user.id as number };
};

beforeEach(async () => {
  await resetDb();
});

describe('GET /api/subscriptions/me', () => {
  it('returns null for user without subscription', async () => {
    const { token } = await registerUser('nosub@test.dev');

    const res = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription).toBeNull();
  });

  it('returns active subscription after trial creation', async () => {
    const { token } = await registerUser('hassub@test.dev');

    await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription).not.toBeNull();
    expect(res.body.subscription.plan).toBe('TRIAL');
    expect(res.body.subscription.status).toBe('ACTIVE');
    expect(res.body.subscription.autoRenew).toBe(false);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/subscriptions/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/subscriptions (create trial)', () => {
  it('creates TRIAL subscription for 7 days with 201', async () => {
    const { token } = await registerUser('trial@test.dev');

    const before = new Date();
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.subscription.plan).toBe('TRIAL');
    expect(res.body.subscription.status).toBe('ACTIVE');
    expect(res.body.subscription.autoRenew).toBe(false);

    const endDate = new Date(res.body.subscription.endDate);
    const diffDays = Math.round(
      (endDate.getTime() - before.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(7);
  });

  it('returns 409 when active subscription already exists', async () => {
    const { token } = await registerUser('active@test.dev');

    await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/active/i);
  });

  it('returns 409 when previous trial exists', async () => {
    const { token, id } = await registerUser('prev@test.dev');

    await prisma.subscription.create({
      data: {
        userId: id,
        plan: 'TRIAL',
        status: 'EXPIRED',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/trial/i);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/subscriptions');
    expect(res.status).toBe(401);
  });
});

describe('Plan limit after subscription', () => {
  it('TRIAL raises device limit from 1 to 3', async () => {
    const { token } = await registerUser('upgrade@test.dev');

    await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`);

    const r1 = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'D1' });
    const r2 = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'D2' });
    const r3 = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'D3' });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r3.status).toBe(201);

    const r4 = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'D4' });

    expect(r4.status).toBe(409);
    expect(r4.body.message).toMatch(/limit/i);
  });
});