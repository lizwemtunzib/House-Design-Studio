import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { DesignStyle } from '../shared/types/house-model.types';
import { visualAI } from '../modules/ai/visual-ai.service';
import { planningAI } from '../modules/ai/planning-ai.service';
import { boqEngine } from '../modules/boq/boq-engine';
import { config } from '../config';

export const designRouter = Router();
const prisma = new PrismaClient();

// File upload
const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const intentSchema = z.object({
  textDescription: z.string().optional(),
  bedrooms: z.number().int().min(1).max(20).optional(),
  bathrooms: z.number().int().min(1).max(20).optional(),
  garages: z.number().int().min(0).max(10).optional(),
  floors: z.number().int().min(1).max(5).optional(),
  targetArea: z.number().positive().optional(),
  plotSize: z.number().positive().optional(),
  style: z.enum(['MODERN', 'CONTEMPORARY', 'LUXURY', 'MINIMALIST', 'AFRICAN_VERNACULAR', 'MEDITERRANEAN', 'TIMBER_HEAVY', 'GLASS_HEAVY', 'PREFAB_MODULAR']).optional(),
  wallSystem: z.string().optional(),
  hasPool: z.boolean().default(false),
  hasGarden: z.boolean().default(true),
  hasDriveway: z.boolean().default(false),
  hasFencing: z.boolean().default(false),
  country: z.string().optional(),
  city: z.string().optional(),
  additionalRequirements: z.string().optional(),
});

// ── GET /designs (list projects) ──────────────────────────────────────────────
designRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user!.id },
    include: {
      houseDesign: { select: { status: true, style: true, exteriorRenders: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(projects);
});

// ── POST /designs/projects (create project) ────────────────────────────────────
designRouter.post('/projects', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, description, country, city, plotSize, currency } = req.body;

  // Check free tier project limit
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { subscription: true } });
  if (user?.subscription?.tier === 'FREE') {
    const count = await prisma.project.count({ where: { userId: req.user!.id } });
    if (count >= 1) throw new AppError(403, 'Free tier limited to 1 project. Upgrade to Pro for unlimited projects.', 'UPGRADE_REQUIRED');
  }

  const project = await prisma.project.create({
    data: { userId: req.user!.id, name, description, country, city, plotSize, currency: currency ?? 'USD' },
  });

  res.status(201).json(project);
});

// ── POST /designs/:projectId/generate (full AI design generation) ──────────────
designRouter.post('/:projectId/generate', authenticate, upload.single('referenceImage'), async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user!.id } });
  if (!project) throw new AppError(404, 'Project not found');

  const intent = intentSchema.parse(typeof req.body.intent === 'string' ? JSON.parse(req.body.intent) : req.body.intent ?? req.body);
  intent.country = intent.country ?? project.country ?? undefined;
  intent.city = intent.city ?? project.city ?? undefined;
  if (project.plotSize) intent.plotSize = project.plotSize;

  const uploadedImageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  // 1. Create or update HouseDesign record
  const design = await prisma.houseDesign.upsert({
    where: { projectId },
    create: {
      projectId,
      userInput: intent.textDescription ?? JSON.stringify(intent),
      style: (intent.style ?? 'MODERN') as any,
      uploadedImageUrl,
      status: 'GENERATING',
    },
    update: {
      userInput: intent.textDescription ?? JSON.stringify(intent),
      style: (intent.style ?? 'MODERN') as any,
      uploadedImageUrl,
      status: 'GENERATING',
    },
  });

  // Return immediately; processing continues async
  res.status(202).json({ designId: design.id, status: 'GENERATING' });

  // 2. Run AI pipeline asynchronously
  setImmediate(async () => {
    try {
      // Step A: Visual AI — generate renders
      const visualResult = await visualAI.generateDesign({
        intent,
        style: intent.style ?? 'MODERN',
        numberOfVariations: 3,
      });

      // Step B: Planning AI — generate structured model
      const planningResult = await planningAI.generateModel({
        intent,
        designNotes: visualResult.designNotes,
      });

      // Step C: Save model to DB
      const modelData = planningResult.houseModel;
      const houseModel = await prisma.houseModel.create({
        data: {
          designId: design.id,
          totalFloorArea: modelData.totalFloorArea,
          groundFloorArea: modelData.groundFloorArea,
          numberOfFloors: modelData.numberOfFloors,
          floorToFloorHeight: modelData.floorToFloorHeight,
          perimeterLength: modelData.perimeterLength,
          wallSystem: modelData.wallSystem as any,
          roofType: modelData.roofType as any,
          roofPitchDegrees: modelData.roofPitchDegrees,
          floorSystem: modelData.floorSystem as any,
          foundationType: modelData.foundationType as any,
          externalWallThickness: modelData.externalWallThickness,
          internalWallThickness: modelData.internalWallThickness,
          totalDoors: modelData.totalDoors,
          totalWindows: modelData.totalWindows,
          totalGlassArea: modelData.totalGlassArea,
          hasDriveway: modelData.externalWorks.hasDriveway,
          drivewaySqm: modelData.externalWorks.drivewaySqm,
          hasPool: modelData.externalWorks.hasPool,
          poolSqm: modelData.externalWorks.poolSqm,
          hasGarden: modelData.externalWorks.hasGarden,
          gardenSqm: modelData.externalWorks.gardenSqm,
          hasFencing: modelData.externalWorks.hasFencing,
          fencingLinearM: modelData.externalWorks.fencingLinearM,
          floors: {
            create: (modelData.rooms ? groupRoomsByFloor(modelData.rooms) : []).map((floor) => ({
              floorNumber: floor.floorNumber,
              floorArea: floor.area,
              rooms: {
                create: floor.rooms.map((r) => ({
                  name: r.name, width: r.width, length: r.length, area: r.area,
                  xPosition: r.xPosition ?? 0, yPosition: r.yPosition ?? 0,
                  doors: r.doors, windows: r.windows, isExternal: r.isExternal,
                })),
              },
            })),
          },
        },
      });

      // Step D: Run BOQ engine
      const fullModel = {
        ...modelData,
        id: houseModel.id,
        projectId,
      };
      const boqResult = boqEngine.calculate(fullModel);

      // Step E: Save BOQ to DB
      const boqRecord = await prisma.bOQ.create({
        data: {
          modelId: houseModel.id,
          items: {
            create: boqResult.items.map((item) => ({
              category: item.category,
              subCategory: item.subCategory,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              notes: item.notes,
              sortOrder: item.sortOrder,
            })),
          },
        },
      });

      // Step F: Update design with results
      await prisma.houseDesign.update({
        where: { id: design.id },
        data: {
          status: 'READY',
          exteriorRenders: visualResult.exteriorRenders,
          interiorConcepts: visualResult.interiorConcepts,
          landscapingRender: visualResult.landscapingRender ?? '',
          designNotes: planningResult.rationale,
        },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'IN_PROGRESS' },
      });

    } catch (err) {
      console.error('Design generation failed:', err);
      await prisma.houseDesign.update({ where: { id: design.id }, data: { status: 'FAILED' } });
    }
  });
});

// ── GET /designs/:projectId (get full design with model and BOQ) ───────────────
designRouter.get('/:projectId', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
    include: {
      houseDesign: {
        include: {
          houseModel: {
            include: {
              floors: { include: { rooms: true } },
              boq: { include: { items: { orderBy: { sortOrder: 'asc' } }, costEstimate: true } },
            },
          },
        },
      },
    },
  });
  if (!project) throw new AppError(404, 'Project not found');
  res.json(project);
});

// ── POST /designs/:projectId/iterate (AI design iteration) ───────────────────
designRouter.post('/:projectId/iterate', authenticate, async (req: AuthRequest, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) throw new AppError(400, 'Iteration prompt required');

  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
    include: { houseDesign: { include: { houseModel: { include: { floors: { include: { rooms: true } } } } } } },
  });
  if (!project?.houseDesign?.houseModel) throw new AppError(404, 'No design model found. Generate a design first.');

  const iteration = await prisma.designIteration.create({
    data: {
      designId: project.houseDesign.id,
      iteration: await prisma.designIteration.count({ where: { designId: project.houseDesign.id } }) + 1,
      userPrompt: prompt,
    },
  });

  res.status(202).json({ iterationId: iteration.id, status: 'PROCESSING' });

  // Process async
  setImmediate(async () => {
    try {
      const model = project.houseDesign!.houseModel!;
      const iterResult = await planningAI.iterateModel({
        currentModel: { ...model, rooms: model.floors.flatMap((f) => f.rooms.map((r) => ({ ...r, floorNumber: f.floorNumber }))) } as any,
        userPrompt: prompt,
      });

      await prisma.designIteration.update({
        where: { id: iteration.id },
        data: { aiResponse: JSON.stringify(iterResult.updatedModel) },
      });
    } catch (err) {
      console.error('Iteration failed:', err);
    }
  });
});

// ── PATCH /designs/:projectId/model (manual model edits from floor plan editor) ─
designRouter.patch('/:projectId/model', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
    include: { houseDesign: { include: { houseModel: true } } },
  });
  if (!project?.houseDesign?.houseModel) throw new AppError(404, 'No design model found');

  const modelId = project.houseDesign.houseModel.id;
  const { rooms, wallSystem, roofType, foundationType } = req.body;

  await prisma.houseModel.update({
    where: { id: modelId },
    data: {
      wallSystem: wallSystem ?? undefined,
      roofType: roofType ?? undefined,
      foundationType: foundationType ?? undefined,
    },
  });

  // Re-run BOQ after model changes
  const updatedModel = await prisma.houseModel.findUnique({
    where: { id: modelId },
    include: { floors: { include: { rooms: true } } },
  });

  res.json({ message: 'Model updated', modelId, note: 'Re-run BOQ to reflect changes' });
});

function groupRoomsByFloor(rooms: any[]) {
  const map = new Map<number, { floorNumber: number; area: number; rooms: any[] }>();
  for (const r of rooms) {
    const fn = r.floorNumber ?? 0;
    if (!map.has(fn)) map.set(fn, { floorNumber: fn, area: 0, rooms: [] });
    const fl = map.get(fn)!;
    fl.rooms.push(r);
    fl.area += r.area;
  }
  return Array.from(map.values());
}
