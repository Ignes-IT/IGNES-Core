import { prisma } from '../config/prisma';
import { Plan, Subscription } from '@prisma/client';

export const getActiveSubscription = async (
    userId: number
): Promise<Subscription | null> => {
    return prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
            OR: [
                { endDate: null },
                { endDate: { gt: new Date() } },
            ],
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getUserActivePlan = async (userId: number): Promise<Plan> => {
    const subscription = await getActiveSubscription(userId);
    return subscription?.plan ?? 'FREE';
};