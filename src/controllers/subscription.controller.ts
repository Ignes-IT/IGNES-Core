import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { getActiveSubscription, getSubscriptionSummary } from '../services/subscription.service';
import { TRIAL_DURATION_DAYS } from '../config/plans';

export const getMySubscription = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const subscription = await getSubscriptionSummary(userId);

    return res.json({ subscription });
};

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