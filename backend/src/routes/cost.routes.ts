import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { costEngine } from '../modules/cost/cost-engine';

export const costRouter = Router();
const prisma = new PrismaClient();

const priceInputSchema = z.array(z.object({
  boqItemId: z.string(),
  unitPrice: z.number().min(0),
  labourRate: z.number().min(0).optional(),
  currency: z.string().default('USD'),
}));

// ── POST /cost/:projectId/calculate ───────────────────────────────────────────
costRouter.post('/:projectId/calculate', authenticate, async (req: AuthRequest, res: Response) => {
  const priceInputs = priceInputSchema.parse(req.body.priceInputs);
  const currency = req.body.currency ?? 'USD';

  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
    include: {
      houseDesign: {
        include: {
          houseModel: {
            include: { boq: { include: { items: true } } },
          },
        },
      },
    },
  });
  if (!project?.houseDesign?.houseModel?.boq) throw new AppError(404, 'BOQ not found');

  const model = project.houseDesign.houseModel;
  const boqItems = model.boq!.items.map((item) => ({
    id: item.id,
    category: item.category as any,
    subCategory: item.subCategory ?? '',
    description: item.description,
    unit: item.unit as any,
    quantity: item.quantity,
    notes: item.notes ?? undefined,
    sortOrder: item.sortOrder,
  }));

  const boqResult: any = {
    modelId: model.id,
    version: 1,
    wallSystemUsed: model.wallSystem,
    items: boqItems,
    summary: { totalItems: boqItems.length, byCategory: {} },
    warnings: [],
    assumptions: [],
  };

  const costResult = costEngine.calculate(boqResult, priceInputs, model.totalFloorArea, currency);

  // Persist cost estimate
  await prisma.costEstimate.upsert({
    where: { boqId: model.boq!.id },
    create: {
      boqId: model.boq!.id,
      currency,
      priceInputs: JSON.parse(JSON.stringify(priceInputs)),
      totalMaterials: costResult.totalMaterials,
      totalLabour: costResult.totalLabour,
      totalCost: costResult.totalCost,
      costPerSqm: costResult.costPerSqm,
      breakdown: JSON.parse(JSON.stringify(costResult.breakdown)),
    },
    update: {
      currency,
      priceInputs: JSON.parse(JSON.stringify(priceInputs)),
      totalMaterials: costResult.totalMaterials,
      totalLabour: costResult.totalLabour,
      totalCost: costResult.totalCost,
      costPerSqm: costResult.costPerSqm,
      breakdown: JSON.parse(JSON.stringify(costResult.breakdown)),
    },
  });

  res.json(costResult);
});

// ── GET /cost/:projectId/benchmarks ───────────────────────────────────────────
costRouter.get('/:projectId/benchmarks', authenticate, async (req: AuthRequest, res: Response) => {
  const region = (req.query.region as any) ?? 'AFRICA';
  const currency = (req.query.currency as string) ?? 'USD';
  const benchmarks = costEngine.getBenchmarkPrices(region, currency);
  res.json({ region, currency, benchmarks, disclaimer: 'Benchmark prices are indicative only. Always verify with local suppliers.' });
});

// ── GET /cost/:projectId ───────────────────────────────────────────────────────
costRouter.get('/:projectId', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
    include: {
      houseDesign: { include: { houseModel: { include: { boq: { include: { costEstimate: true } } } } } },
    },
  });
  if (!project?.houseDesign?.houseModel?.boq?.costEstimate) {
    throw new AppError(404, 'No cost estimate found. Calculate costs first.');
  }
  res.json(project.houseDesign.houseModel.boq.costEstimate);
});
