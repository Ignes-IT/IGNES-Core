import request from 'supertest';
import { app } from '../src/app';

describe('GET /health', () => {
  it('returns 200 with status, db and version', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      db: 'ok',
      version: '0.1.0',
    });
  });
});