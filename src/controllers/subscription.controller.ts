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

export const mockUpgrade = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    let subscription;

    if (existingSubscription) {
      subscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan: 'PRO',
          status: 'ACTIVE',
          endDate
        }
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          plan: 'PRO',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate,
        }
      });
    }

    res.json({ message: 'Mock upgrade to PRO successful', subscription });
  } catch (error) {
    console.error('Mock upgrade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};