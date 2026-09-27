import { prisma } from '../../src/config/prisma';

export const resetDb = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "User", "Device", "Subscription" RESTART IDENTITY CASCADE'
  );
};