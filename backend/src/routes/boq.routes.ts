import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { boqEngine } from '../modules/boq/boq-engine';

export const boqRouter = Router();
const prisma = new PrismaClient();

// ── GET /boq/:projectId ────────────────────────────────────────────────────────
boqRouter.get('/:projectId', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
    include: {
      houseDesign: {
        include: {
          houseModel: {
            include: {
              boq: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
            },
          },
        },
      },
    },
  });
  if (!project?.houseDesign?.houseModel?.boq) throw new AppError(404, 'BOQ not found. Generate a design first.');
  res.json(project.houseDesign.houseModel.boq);
});

// ── POST /boq/:projectId/recalculate ──────────────────────────────────────────
boqRouter.post('/:projectId/recalculate', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
    include: {
      houseDesign: {
        include: {
          houseModel: { include: { floors: { include: { rooms: true } } } },
        },
      },
    },
  });
  if (!project?.houseDesign?.houseModel) throw new AppError(404, 'No design model found');

  const model = project.houseDesign.houseModel;
  const rooms = model.floors.flatMap((f) => f.rooms.map((r) => ({ ...r, floorNumber: f.floorNumber })));

  // Reconstruct full model spec
  const modelSpec: any = {
    id: model.id,
    projectId: project.id,
    totalFloorArea: model.totalFloorArea,
    groundFloorArea: model.groundFloorArea,
    numberOfFloors: model.numberOfFloors,
    floorToFloorHeight: model.floorToFloorHeight,
    perimeterLength: model.perimeterLength,
    wallSystem: model.wallSystem,
    roofType: model.roofType,
    roofPitchDegrees: model.roofPitchDegrees,
    floorSystem: model.floorSystem,
    foundationType: model.foundationType,
    externalWallThickness: model.externalWallThickness,
    internalWallThickness: model.internalWallThickness,
    totalDoors: model.totalDoors,
    totalWindows: model.totalWindows,
    totalGlassArea: model.totalGlassArea,
    totalExternalWallArea: model.perimeterLength * model.floorToFloorHeight * model.numberOfFloors,
    totalInternalWallArea: model.perimeterLength * model.floorToFloorHeight * model.numberOfFloors * 0.65,
    totalOpeningsArea: model.totalGlassArea * 1.2,
    roofArea: model.groundFloorArea * (model.roofType === 'FLAT' ? 1 : 1.15) * 1.1,
    rooms,
    openings: [],
    externalWorks: {
      hasDriveway: model.hasDriveway,
      drivewaySqm: model.drivewaySqm,
      hasPool: model.hasPool,
      poolSqm: model.poolSqm,
      hasGarden: model.hasGarden,
      gardenSqm: model.gardenSqm,
      hasFencing: model.hasFencing,
      fencingLinearM: model.fencingLinearM,
      hasRetainingWall: false,
      retainingWallLinearM: 0,
      hasPathways: false,
      pathwaysSqm: 0,
    },
    landscaping: {
      hasLawnTurf: model.hasGarden,
      lawnSqm: model.gardenSqm * 0.7,
      hasGardenBeds: model.hasGarden,
      gardenBedsSqm: model.gardenSqm * 0.3,
      hasIrrigation: false,
      hasStonePaving: false,
      stonePavingSqm: 0,
      numberOfTrees: 3,
      numberOfShrubs: 10,
    },
  };

  // Generate door/window openings from room data
  modelSpec.openings = generateOpenings(model.totalDoors, model.totalWindows);

  const boqResult = boqEngine.calculate(modelSpec);

  // Delete old BOQ items and recreate
  const existingBoq = await prisma.bOQ.findUnique({ where: { modelId: model.id } });
  if (existingBoq) {
    await prisma.bOQItem.deleteMany({ where: { boqId: existingBoq.id } });
    await prisma.bOQ.update({
      where: { id: existingBoq.id },
      data: {
        version: { increment: 1 },
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
  }

  res.json({ message: 'BOQ recalculated', itemCount: boqResult.items.length, warnings: boqResult.warnings });
});

function generateOpenings(totalDoors: number, totalWindows: number) {
  return [
    { type: 'DOOR', width: 0.9, height: 2.1, quantity: totalDoors, area: 0.9 * 2.1, totalArea: totalDoors * 0.9 * 2.1 },
    { type: 'WINDOW', width: 1.2, height: 1.0, quantity: Math.floor(totalWindows * 0.7), area: 1.2, totalArea: Math.floor(totalWindows * 0.7) * 1.2 },
    { type: 'WINDOW', width: 0.6, height: 0.6, quantity: Math.ceil(totalWindows * 0.3), area: 0.36, totalArea: Math.ceil(totalWindows * 0.3) * 0.36 },
  ];
}
