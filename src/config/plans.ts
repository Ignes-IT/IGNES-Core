import { Plan } from '@prisma/client';

export const DEVICE_LIMITS: Record<Plan, number> = {
    FREE: 1,
    TRIAL: 3,
    PRO: 10,
    BUSINESS: 50,
}; 