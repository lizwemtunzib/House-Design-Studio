import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { pdfExportService } from '../modules/export/pdf-export.service';
import { excelExportService } from '../modules/export/excel-export.service';

export const exportRouter = Router();
const prisma = new PrismaClient();

const EXPORTS_DIR = path.join(__dirname, '../../exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

// ── POST /export/:projectId/pdf ────────────────────────────────────────────────
exportRouter.post('/:projectId/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  const data = await loadExportData(req.params.projectId, req.user!.id);

  const buffer = await pdfExportService.generateBOQReport({
    ...data,
    disclaimer: 'For budgeting purposes only. Not a certified estimate.',
    generatedAt: new Date(),
  });

  const filename = `BOQ_${sanitize(data.projectName)}_${Date.now()}.pdf`;
  const filePath = path.join(EXPORTS_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  await prisma.export.create({
    data: {
      projectId: req.params.projectId,
      userId: req.user!.id,
      format: 'PDF',
      fileUrl: `/exports/${filename}`,
      fileName: filename,
      fileSizeKb: Math.ceil(buffer.length / 1024),
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

// ── POST /export/:projectId/excel ──────────────────────────────────────────────
exportRouter.post('/:projectId/excel', authenticate, async (req: AuthRequest, res: Response) => {
  const data = await loadExportData(req.params.projectId, req.user!.id);

  const buffer = await excelExportService.generateBOQWorkbook({
    ...data,
    generatedAt: new Date(),
  });

  const filename = `BOQ_${sanitize(data.projectName)}_${Date.now()}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  await prisma.export.create({
    data: {
      projectId: req.params.projectId,
      userId: req.user!.id,
      format: 'EXCEL',
      fileUrl: `/exports/${filename}`,
      fileName: filename,
      fileSizeKb: Math.ceil(buffer.length / 1024),
    },
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

// ── GET /export/:projectId/history ────────────────────────────────────────────
exportRouter.get('/:projectId/history', authenticate, async (req: AuthRequest, res: Response) => {
  const exports = await prisma.export.findMany({
    where: { projectId: req.params.projectId, userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(exports);
});

async function loadExportData(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
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
  if (!project?.houseDesign?.houseModel?.boq) throw new AppError(404, 'BOQ not found. Generate a design first.');

  const model = project.houseDesign.houseModel;
  const boq = model.boq!;
  const cost = boq.costEstimate;

  const rooms = model.floors.flatMap((f) => f.rooms.map((r) => ({ ...r, floorNumber: f.floorNumber })));

  const houseModel: any = {
    id: model.id, projectId,
    totalFloorArea: model.totalFloorArea, groundFloorArea: model.groundFloorArea,
    numberOfFloors: model.numberOfFloors, floorToFloorHeight: model.floorToFloorHeight,
    perimeterLength: model.perimeterLength, wallSystem: model.wallSystem,
    roofType: model.roofType, roofPitchDegrees: model.roofPitchDegrees,
    floorSystem: model.floorSystem, foundationType: model.foundationType,
    externalWallThickness: model.externalWallThickness, internalWallThickness: model.internalWallThickness,
    totalDoors: model.totalDoors, totalWindows: model.totalWindows, totalGlassArea: model.totalGlassArea,
    totalExternalWallArea: model.perimeterLength * model.floorToFloorHeight * model.numberOfFloors,
    totalInternalWallArea: model.perimeterLength * model.floorToFloorHeight * model.numberOfFloors * 0.65,
    totalOpeningsArea: model.totalGlassArea * 1.2,
    roofArea: model.groundFloorArea * 1.15 * 1.1,
    rooms, openings: [], externalWorks: {}, landscaping: {},
  };

  const boqResult: any = {
    modelId: model.id, version: 1, wallSystemUsed: model.wallSystem,
    items: boq.items.map((i) => ({ id: i.id, category: i.category, subCategory: i.subCategory, description: i.description, unit: i.unit, quantity: i.quantity, notes: i.notes, sortOrder: i.sortOrder })),
    summary: { totalItems: boq.items.length, byCategory: {} },
    warnings: [], assumptions: [],
  };

  const costResult = cost ? {
    boqId: boq.id, currency: cost.currency,
    totalMaterials: cost.totalMaterials, totalLabour: cost.totalLabour,
    totalCost: cost.totalCost, costPerSqm: cost.costPerSqm,
    floorArea: model.totalFloorArea,
    breakdown: (cost.breakdown as any[]) ?? [],
    lineItems: [],
    summary: { mostExpensiveCategory: '', labourToMaterialRatio: 0, estimateConfidence: 'MEDIUM' as const, notes: [] },
  } : undefined;

  return { projectName: project.name, currency: project.currency, houseModel, boq: boqResult, cost: costResult };
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
}
