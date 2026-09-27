import request from 'supertest';
import { app } from '../src/app';

describe('GET /api/plans', () => {
  it('returns all four plans in stable order', async () => {
    const res = await request(app).get('/api/plans');

    expect(res.status).toBe(200);
    expect(res.body.plans).toHaveLength(4);

    const planNames = res.body.plans.map((p: any) => p.plan);
    expect(planNames).toEqual(['FREE', 'TRIAL', 'PRO', 'BUSINESS']);
  });

  it('includes deviceLimit and price for each plan', async () => {
    const res = await request(app).get('/api/plans');

    for (const p of res.body.plans) {
      expect(p).toHaveProperty('deviceLimit');
      expect(p).toHaveProperty('price');
    }

    const free = res.body.plans.find((p: any) => p.plan === 'FREE');
    expect(free).toMatchObject({ deviceLimit: 1, price: 0 });
  });

  it('includes durationDays only for TRIAL', async () => {
    const res = await request(app).get('/api/plans');
    const trial = res.body.plans.find((p: any) => p.plan === 'TRIAL');
    const free = res.body.plans.find((p: any) => p.plan === 'FREE');

    expect(trial.durationDays).toBe(7);
    expect(free).not.toHaveProperty('durationDays');
  });

  it('is public (no token required)', async () => {
    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(200);
  });
});