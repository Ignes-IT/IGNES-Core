import request from 'supertest';
import { app } from '../src/app';
import { defaultBrandConfig } from '@ignes/shared';

describe('GET /api/brand', () => {
  it('returns brand config from @ignes/shared', async () => {
    const res = await request(app).get('/api/brand');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: defaultBrandConfig.name,
      supportEmail: defaultBrandConfig.supportEmail,
    });
    expect(res.body.colors).toHaveProperty('primary');
    expect(res.body.domains).toHaveProperty('api');
  });

  it('is public (no token required)', async () => {
    const res = await request(app).get('/api/brand');
    expect(res.status).toBe(200);
  });
});