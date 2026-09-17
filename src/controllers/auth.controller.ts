import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config/environment';

export const register = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName },
    });

const token = jwt.sign({ userId: user.id, email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });

    res.status(201).json({
      token,
      user: { id: user.id, email, firstName, lastName, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

const token = jwt.sign({ userId: user.id, email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });

    res.json({
      token,
      user: { id: user.id, email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
