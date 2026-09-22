import { prisma } from '../config/prisma';
import { Plan } from '@prisma/client';

export const getUserActivePlan = async ( userId: number): Promise<Plan> => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId, status: 'ACTIVE',
            OR: [
                { endDate: null },
                { endDate: { gt: new Date() } },
            ],
        },
        orderBy: { createdAt: 'desc' },
    });

    return subscription?.plan ?? 'FREE';
}