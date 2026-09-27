import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { resetDb } from './helpers/db';

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns token + user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.dev', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      email: 'new@test.dev',
      role: 'user',
    });

    const user = await prisma.user.findUnique({ where: { email: 'new@test.dev' } });
    expect(user).not.toBeNull();
    expect(user!.password).not.toBe('password123'); 
  });

  it('rejects weak password (< 8 chars) with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@test.dev', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects duplicate email with 400', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.dev', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.dev', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@test.dev', password: 'password123' });
  });

  it('returns token + user for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.dev', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('login@test.dev');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.dev', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 401 for non-existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.dev', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

describe('JWT payload', () => {
  it('contains userId and email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jwt@test.dev', password: 'password123' });

    const token = res.body.token;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    expect(payload).toHaveProperty('userId');
    expect(payload.email).toBe('jwt@test.dev');
    expect(payload).not.toHaveProperty('password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns current user profile with valid token', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: 'me@test.dev', password: 'password123' });

    const token = register.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'me@test.dev',
      role: 'user',
    });
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('createdAt');
  });

  it('does not leak password', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: 'leak@test.dev', password: 'password123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${register.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });
});