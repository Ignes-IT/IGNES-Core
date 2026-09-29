import { prisma } from '../config/prisma';
import { Plan, Subscription } from '@prisma/client';
import { DEVICE_LIMITS } from '../config/plans';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

export const enrichSubscription = (
    subscription: Subscription,
    deviceCount: number
) => {
    const daysRemaining = subscription.endDate
        ? Math.ceil((subscription.endDate.getTime() - Date.now()) / MS_PER_DAY)
        : null;

    return {
        ...subscription,
        deviceLimit: DEVICE_LIMITS[subscription.plan],
        deviceCount,
        daysRemaining,
    };
};

export const getSubscriptionSummary = async (userId: number) => {
    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
        return null;
    }

    const deviceCount = await prisma.device.count({ where: { userId } });
    return enrichSubscription(subscription, deviceCount);
};