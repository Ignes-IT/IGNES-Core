import { Plan } from '@prisma/client';

export const DEVICE_LIMITS: Record<Plan, number> = {
    FREE: 1,
    TRIAL: 2,
    PRO: 5,
    BUSINESS: 10,
}; 

export const PLAN_PRICES: Record<Plan, number> = {
    FREE: 0,
    TRIAL: 0,
    PRO: 299,
    BUSINESS: 999,
};

export const TRIAL_DURATION_DAYS = 7;