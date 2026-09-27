import { Request, Response } from 'express';
import { Plan } from '@prisma/client';

import { DEVICE_LIMITS, PLAN_PRICES, TRIAL_DURATION_DAYS, } from '../config/plans';

export const getPlans = (_req: Request, res: Response) => {
    const plans = (Object.keys(DEVICE_LIMITS) as Plan[]).map((plan) => {
        const base = {
            plan,
            deviceLimit: DEVICE_LIMITS[plan],
            price: PLAN_PRICES[plan],
        };

        return plan === 'TRIAL' ? {
            ...base,
            durationDays: TRIAL_DURATION_DAYS
        } : base;
    });

    res.json({ plans });
};