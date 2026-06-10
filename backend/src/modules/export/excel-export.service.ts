import ExcelJS from 'exceljs';
import { BOQResult } from '../boq/boq.types';
import { CostResult } from '../cost/cost.types';
import { HouseModelSpec } from '../../shared/types/house-model.types';

interface ExportData {
  projectName: string;
  currency: string;
  houseModel: HouseModelSpec;
  boq: BOQResult;
  cost?: CostResult;
  generatedAt: Date;
}

export class ExcelExportService {
  async generateBOQWorkbook(data: ExportData): Promise<Buffer> {
    const { projectName, currency, houseModel, boq, cost, generatedAt } = data;
    const wb = new ExcelJS.Workbook();

    wb.creator = 'House Design Studio';
    wb.created = generatedAt;
    wb.properties.date1904 = false;

    this.buildSummarySheet(wb, data);
    this.buildBOQSheet(wb, data);
    if (cost) this.buildCostSheet(wb, cost, currency);
    this.buildModelDataSheet(wb, houseModel);

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildSummarySheet(wb: ExcelJS.Workbook, data: ExportData) {
    const { projectName, currency, houseModel, boq, cost, generatedAt } = data;
    const ws = wb.addWorksheet('Summary');

    this.applySheetDefaults(ws, [30, 20, 20, 20]);

    // Title
    ws.mergeCells('A1:D1');
    const title = ws.getCell('A1');
    title.value = 'BILL OF QUANTITIES — HOUSE DESIGN STUDIO';
    title.style = { font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
    ws.getRow(1).height = 30;

    // Project info
    ws.mergeCells('A2:D2');
    ws.getCell('A2').value = projectName;
    ws.getCell('A2').style = { font: { bold: true, size: 12 }, alignment: { horizontal: 'center' } };

    ws.getCell('A4').value = 'Property';
    ws.getCell('B4').value = 'Value';
    [['A4', 'B4']].forEach(([h]) => ws.getCell(h).style = { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF2F7' } } });

    const summaryRows = [
      ['Project Name', projectName],
      ['Generated', generatedAt.toLocaleString()],
      ['Total Floor Area', `${houseModel.totalFloorArea.toFixed(1)} m²`],
      ['Ground Floor Area', `${houseModel.groundFloorArea.toFixed(1)} m²`],
      ['Number of Floors', houseModel.numberOfFloors],
      ['Wall System', houseModel.wallSystem.replace(/_/g, ' ')],
      ['Roof Type', houseModel.roofType.replace(/_/g, ' ')],
      ['Foundation Type', houseModel.foundationType.replace(/_/g, ' ')],
      ['Perimeter', `${houseModel.perimeterLength.toFixed(1)} m`],
      ['Total BOQ Items', boq.summary.totalItems],
      ['Total Doors', houseModel.totalDoors],
      ['Total Windows', houseModel.totalWindows],
    ];

    summaryRows.forEach(([key, val], i) => {
      ws.getCell(`A${5 + i}`).value = key as string;
      ws.getCell(`B${5 + i}`).value = val as string | number;
    });

    if (cost && cost.totalCost > 0) {
      const startRow = 5 + summaryRows.length + 2;
      ws.getCell(`A${startRow}`).value = 'COST SUMMARY';
      ws.getCell(`A${startRow}`).style = { font: { bold: true, size: 11, color: { argb: 'FF2B6CB0' } } };
      [
        ['Total Materials Cost', `${currency} ${cost.totalMaterials.toLocaleString()}`],
        ['Total Labour Cost', `${currency} ${cost.totalLabour.toLocaleString()}`],
        ['TOTAL PROJECT COST', `${currency} ${cost.totalCost.toLocaleString()}`],
        ['Cost per m²', `${currency} ${cost.costPerSqm.toLocaleString()}`],
        ['Estimate Confidence', cost.summary.estimateConfidence],
      ].forEach(([key, val], i) => {
        ws.getCell(`A${startRow + 1 + i}`).value = key as string;
        ws.getCell(`B${startRow + 1 + i}`).value = val as string;
        if (key === 'TOTAL PROJECT COST') {
          ws.getCell(`A${startRow + 1 + i}`).style = { font: { bold: true } };
          ws.getCell(`B${startRow + 1 + i}`).style = { font: { bold: true, color: { argb: 'FF2B6CB0' } } };
        }
      });
    }

    // Disclaimer
    ws.mergeCells('A25:D25');
    ws.getCell('A25').value = '⚠ DISCLAIMER: This document is for budgeting purposes only. Not a certified or approved estimate. Always obtain contractor quotations.';
    ws.getCell('A25').style = { font: { color: { argb: 'FF856404' }, size: 8 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } } };
  }

  private buildBOQSheet(wb: ExcelJS.Workbook, data: ExportData) {
    const { boq, cost, currency } = data;
    const ws = wb.addWorksheet('Bill of Quantities');

    this.applySheetDefaults(ws, [12, 55, 20, 10, 12, 16, 16, 16]);

    // Header row
    const headers = ['#', 'Description', 'Sub-Category', 'Unit', 'Quantity', cost ? `Unit Price (${currency})` : '', cost ? `Labour Rate (${currency})` : '', cost ? `Total (${currency})` : ''].filter(Boolean);
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { bottom: { style: 'thin', color: { argb: 'FF90CDF4' } } },
      };
    });
    ws.getRow(1).height = 22;

    const categories = [...new Set(boq.items.map((i) => i.category))];
    let rowIdx = 2;

    for (const cat of categories) {
      const catItems = boq.items.filter((i) => i.category === cat);

      // Category sub-header
      const catRow = ws.addRow([cat.replace(/_/g, ' ')]);
      ws.mergeCells(`A${rowIdx}:${cost ? 'H' : 'E'}${rowIdx}`);
      catRow.getCell(1).style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } },
      };
      rowIdx++;

      catItems.forEach((item, i) => {
        const lineItem = cost?.lineItems.find((l) => l.boqItemId === item.id);
        const rowData = [
          i + 1,
          item.description,
          item.subCategory ?? '',
          item.unit,
          item.quantity % 1 === 0 ? item.quantity : parseFloat(item.quantity.toFixed(3)),
          ...(cost ? [lineItem?.unitPrice ?? 0, lineItem?.labourRate ?? 0, lineItem?.totalCost ?? 0] : []),
        ];

        const row = ws.addRow(rowData);
        row.getCell(5).numFmt = '#,##0.00';
        if (cost) {
          row.getCell(6).numFmt = `#,##0.00`;
          row.getCell(7).numFmt = `#,##0.00`;
          row.getCell(8).numFmt = `#,##0.00`;
        }

        if (i % 2 === 0) {
          row.eachCell((cell) => {
            cell.style = { ...cell.style, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } } };
          });
        }
        rowIdx++;
      });

      rowIdx++;
    }

    // Warnings
    if (boq.warnings.length > 0) {
      rowIdx++;
      ws.getCell(`A${rowIdx}`).value = 'IMPORTANT NOTES';
      ws.getCell(`A${rowIdx}`).style = { font: { bold: true, color: { argb: 'FFE53E3E' } } };
      rowIdx++;
      boq.warnings.forEach((w) => {
        ws.getCell(`A${rowIdx}`).value = `• ${w}`;
        ws.mergeCells(`A${rowIdx}:${cost ? 'H' : 'E'}${rowIdx}`);
        rowIdx++;
      });
    }

    ws.autoFilter = { from: 'A1', to: `E1` };
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }

  private buildCostSheet(wb: ExcelJS.Workbook, cost: CostResult, currency: string) {
    const ws = wb.addWorksheet('Cost Breakdown');
    this.applySheetDefaults(ws, [30, 18, 18, 18, 12]);

    ws.addRow(['Category', `Materials (${currency})`, `Labour (${currency})`, `Total (${currency})`, '% of Total']);
    ws.getRow(1).eachCell((cell) => {
      cell.style = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } } };
    });

    cost.breakdown.forEach((cat, i) => {
      const row = ws.addRow([
        cat.category.replace(/_/g, ' '),
        cat.materialsCost,
        cat.labourCost,
        cat.totalCost,
        `${cat.percentage.toFixed(1)}%`,
      ]);
      [2, 3, 4].forEach((col) => { row.getCell(col).numFmt = `#,##0.00`; });
      if (i % 2 === 0) {
        row.eachCell((cell) => { cell.style = { ...cell.style, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } } }; });
      }
    });

    // Totals row
    const totals = ws.addRow([
      'TOTAL',
      cost.totalMaterials,
      cost.totalLabour,
      cost.totalCost,
      '100%',
    ]);
    totals.eachCell((cell) => { cell.style = { font: { bold: true } }; });
    [2, 3, 4].forEach((col) => { totals.getCell(col).numFmt = `#,##0.00`; });
  }

  private buildModelDataSheet(wb: ExcelJS.Workbook, model: HouseModelSpec) {
    const ws = wb.addWorksheet('Design Model Data');
    this.applySheetDefaults(ws, [30, 20]);

    ws.addRow(['Field', 'Value']);
    ws.getRow(1).eachCell((c) => { c.style = { font: { bold: true } }; });

    const entries: [string, string | number | boolean][] = [
      ['Total Floor Area (m²)', model.totalFloorArea],
      ['Ground Floor Area (m²)', model.groundFloorArea],
      ['Number of Floors', model.numberOfFloors],
      ['Floor to Floor Height (m)', model.floorToFloorHeight],
      ['Perimeter Length (m)', model.perimeterLength],
      ['Wall System', model.wallSystem],
      ['External Wall Thickness (m)', model.externalWallThickness],
      ['Internal Wall Thickness (m)', model.internalWallThickness],
      ['Roof Type', model.roofType],
      ['Roof Pitch (degrees)', model.roofPitchDegrees],
      ['Roof Area (m²)', model.roofArea],
      ['Floor System', model.floorSystem],
      ['Foundation Type', model.foundationType],
      ['Total External Wall Area (m²)', model.totalExternalWallArea],
      ['Total Internal Wall Area (m²)', model.totalInternalWallArea],
      ['Total Openings Area (m²)', model.totalOpeningsArea],
      ['Total Doors', model.totalDoors],
      ['Total Windows', model.totalWindows],
      ['Total Glass Area (m²)', model.totalGlassArea],
    ];

    entries.forEach(([k, v]) => ws.addRow([k, v]));

    ws.addRow(['']);
    ws.addRow(['ROOMS']);
    ws.addRow(['Name', 'Width (m)', 'Length (m)', 'Area (m²)', 'Floor', 'Doors', 'Windows']);
    model.rooms.forEach((r) => ws.addRow([r.name, r.width, r.length, r.area, r.floorNumber, r.doors, r.windows]));
  }

  private applySheetDefaults(ws: ExcelJS.Worksheet, colWidths: number[]) {
    colWidths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });
    ws.properties.defaultRowHeight = 16;
  }
}

export const excelExportService = new ExcelExportService();
