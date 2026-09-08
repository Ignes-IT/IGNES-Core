import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { userCreateSchema, userLoginSchema } from '@ignes/shared';

const router = Router();

router.post('/register', validate(userCreateSchema), register);
router.post('/login', validate(userLoginSchema), login);

export default router;
