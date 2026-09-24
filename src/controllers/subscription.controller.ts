import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { getActiveSubscription } from '../services/subscription.service';

export const getMySubscription = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const subscription = await getActiveSubscription(userId);

    return res.json({ subscription });
};

const TRIAL_DURATION_DAYS = 7;

export const createTrialSubscription = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const now = new Date();

  const activeSubscription = await getActiveSubscription(userId);

  if (activeSubscription) {
    return res.status(409).json({ message: 'You already have an active subscription' });
  }

  const previousTrial = await prisma.subscription.findFirst({
    where: { userId, plan: 'TRIAL' },
  });

  if (previousTrial) {
    return res.status(409).json({ message: 'Trial has already been used' });
  }

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      plan: 'TRIAL',
      status: 'ACTIVE',
      startDate: now,
      endDate,
      autoRenew: false,
    },
  });

  return res.status(201).json({ subscription });
};