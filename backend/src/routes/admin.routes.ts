import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

export const adminRouter = Router();
const prisma = new PrismaClient();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/stats', async (_req, res: Response) => {
  const [users, projects, boqs] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.bOQ.count(),
  ]);
  res.json({ users, projects, boqs });
});

adminRouter.get('/city-rules', async (_req, res: Response) => {
  const rules = await prisma.cityRules.findMany({ orderBy: [{ country: 'asc' }, { city: 'asc' }] });
  res.json(rules);
});

adminRouter.post('/city-rules', async (req, res: Response) => {
  const rule = await prisma.cityRules.create({ data: req.body });
  res.status(201).json(rule);
});

adminRouter.put('/city-rules/:id', async (req, res: Response) => {
  const rule = await prisma.cityRules.update({ where: { id: req.params.id }, data: req.body });
  res.json(rule);
});
