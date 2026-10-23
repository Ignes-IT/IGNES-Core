import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { prisma } from '../config/prisma';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  let decoded: { userId: string; email: string };
  try {
    decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
  } catch (error) {
    console.error('authMiddleware: user lookup failed:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }

  (req as any).user = decoded;
  next();
};
