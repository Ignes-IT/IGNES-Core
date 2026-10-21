import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getMySubscription, createTrialSubscription, mockUpgrade } from '../controllers/subscription.controller';

const router = Router();

router.use(authMiddleware);
router.get('/me', getMySubscription);
router.post('/', createTrialSubscription);
router.post('/mock-upgrade', authMiddleware, mockUpgrade)

export default router;