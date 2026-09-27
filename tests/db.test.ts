import { prisma } from '../src/config/prisma';
import { resetDb } from './helpers/db';

beforeEach(async () => {
  await resetDb();
});

describe('test DB infrastructure', () => {
  it('can create and read a user', async () => {
    const user = await prisma.user.create({
      data: { email: 'infra@test.dev', password: 'hash' },
    });

    expect(user.id).toBe(1);
    expect(user.email).toBe('infra@test.dev');
    expect(user.isActive).toBe(true);
  });

  it('resetDb clears the User table between tests', async () => {
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });
});