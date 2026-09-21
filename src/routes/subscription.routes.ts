import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getMySubscription } from '../controllers/subscription.controller';

const router = Router();

router.use(authMiddleware);
router.get('/me', getMySubscription);

export default router;