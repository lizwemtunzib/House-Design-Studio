import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();
const prisma = new PrismaClient();
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isAdminEmail = (email: string) => config.adminEmails.includes(normalizeEmail(email));
const ADMIN_ROLE = 'ADMIN';
const USER_ROLE = 'USER';
const asyncRoute =
  <TRequest extends Request>(handler: (req: TRequest, res: Response) => Promise<void>) =>
  (req: TRequest, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform(normalizeEmail),
  password: z.string().min(8),
  country: z.string().trim().optional(),
  preferredLang: z.string().default('en'),
});

const loginSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  password: z.string(),
});

authRouter.post('/register', asyncRoute(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: isAdminEmail(body.email) ? ADMIN_ROLE : USER_ROLE,
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
}));

authRouter.post('/login', asyncRoute(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  let user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { subscription: true },
  });
  if (!user) throw new AppError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  if (isAdminEmail(user.email) && user.role !== ADMIN_ROLE) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: ADMIN_ROLE },
      include: { subscription: true },
    });
  }

  const token = signToken(user.id, user.email, user.role, user.subscription?.tier ?? 'FREE');

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.subscription?.tier },
  });
}));

authRouter.get('/me', authenticate, asyncRoute(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { subscription: true },
  });
  if (!user) throw new AppError(404, 'User not found');

  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.json(safeUser);
}));

authRouter.patch('/me', authenticate, asyncRoute(async (req: AuthRequest, res: Response) => {
  const { name, country, preferredLang, currency } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name, country, preferredLang, currency },
  });

  const { passwordHash: _passwordHash, ...safeUser } = updated;
  res.json(safeUser);
}));

function signToken(userId: string, email: string, role: string, subscriptionTier: string) {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign({ userId, email, role, subscriptionTier }, config.jwt.secret, options);
}
