import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getMySubscription = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const subscription = await prisma.subscription.findFirst({
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

    return res.json({ subscription });
};