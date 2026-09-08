import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: error.issues.map(e => ({ field: e.path.join('.'), message: e.message })) });
      } else {
        next(error);
      }
    }
  };
};
