import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.string().optional(),
  preferredLang: z.string().default('en'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/register', async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      country: body.country,
      preferredLang: body.preferredLang,
      subscription: { create: { tier: 'FREE' } },
    },
    include: { subscription: true },
  });

  const token = signToken(user.id, user.email, user.role, user.subscription?.tier ?? 'FREE');

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.subscription?.tier },
  });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { subscription: true },
  });
  if (!user) throw new AppError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const token = signToken(user.id, user.email, user.role, user.subscription?.tier ?? 'FREE');

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.subscription?.tier },
  });
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { subscription: true },
    omit: { passwordHash: true } as any,
  });
  res.json(user);
});

authRouter.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, country, preferredLang, currency } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name, country, preferredLang, currency },
    omit: { passwordHash: true } as any,
  });
  res.json(updated);
});

function signToken(userId: string, email: string, role: string, subscriptionTier: string) {
  return jwt.sign({ userId, email, role, subscriptionTier }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}
