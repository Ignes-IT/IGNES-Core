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

describe('POST /api/devices', () => {
  it('creates a device and returns deviceId + publicKey', async () => {
    const { token } = await registerUser('dev1@test.dev');

    const res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'iPhone' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('deviceId');
    expect(res.body).toHaveProperty('publicKey');

    const device = await prisma.device.findFirst({ where: { name: 'iPhone' } });
    expect(device).not.toBeNull();
    expect(device!.publicKey).toBe(res.body.publicKey);
  });

  it('rejects request without token with 401', async () => {
    const res = await request(app)
      .post('/api/devices')
      .send({ name: 'NoAuth' });

    expect(res.status).toBe(401);
  });

  it('rejects request with invalid token with 401', async () => {
    const res = await request(app)
      .post('/api/devices')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ name: 'BadToken' });

    expect(res.status).toBe(401);
  });

  it('enforces FREE plan limit (1 device) with 409', async () => {
    const { token } = await registerUser('limit@test.dev');

    const first = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'First' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Second' });

    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/limit/i);
  });
});

describe('GET /api/devices', () => {
  it('returns empty list for new user', async () => {
    const { token } = await registerUser('empty@test.dev');

    const res = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.devices).toEqual([]);
  });

  it('returns own device, not other users', async () => {
    const alice = await registerUser('alice@test.dev');
    const bob = await registerUser('bob@test.dev');

    await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'AliceDevice' });

    const res = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    expect(res.body.devices).toEqual([]);
  });
});

describe('DELETE /api/devices/:id', () => {
  it('deletes own device and returns 204', async () => {
    const { token } = await registerUser('del@test.dev');

    const create = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ToDelete' });

    const res = await request(app)
      .delete(`/api/devices/${create.body.deviceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const remaining = await prisma.device.count();
    expect(remaining).toBe(0);
  });

  it('returns 404 for unknown UUID', async () => {
    const { token } = await registerUser('del404@test.dev');

    const res = await request(app)
      .delete('/api/devices/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .delete('/api/devices/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(401);
  });

  it('IDOR: user B cannot delete user A device', async () => {
    const alice = await registerUser('idor-a@test.dev');
    const bob = await registerUser('idor-b@test.dev');

    const create = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'AliceDevice' });

    const aliceDeviceId = create.body.deviceId;

    const res = await request(app)
      .delete(`/api/devices/${aliceDeviceId}`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(404);

    const stillThere = await prisma.device.findUnique({ where: { id: aliceDeviceId } });
    expect(stillThere).not.toBeNull();
  });
});

describe('GET /api/vpn/config/:uuid', () => {
  it('returns .conf file for own device', async () => {
    const { token } = await registerUser('conf@test.dev');

    const create = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ConfigDevice' });

    const res = await request(app)
      .get(`/api/vpn/config/${create.body.deviceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('[Interface]');
    expect(res.text).toContain('PrivateKey');
    expect(res.text).toContain('[Peer]');
  });

  it('IDOR: user B cannot read user A config (404)', async () => {
    const alice = await registerUser('conf-a@test.dev');
    const bob = await registerUser('conf-b@test.dev');

    const create = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'AliceConf' });

    const res = await request(app)
      .get(`/api/vpn/config/${create.body.deviceId}`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .get('/api/vpn/config/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(401);
  });
});