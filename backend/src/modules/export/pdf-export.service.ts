import PDFDocument from 'pdfkit';
import { Writable } from 'stream';
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
  disclaimer: string;
}

export class PDFExportService {
  async generateBOQReport(data: ExportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      const writable = new Writable({
        write(chunk, _enc, cb) { chunks.push(chunk); cb(); },
      });

      doc.pipe(writable);
      writable.on('finish', () => resolve(Buffer.concat(chunks)));
      writable.on('error', reject);

      try {
        this.renderDocument(doc, data);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private renderDocument(doc: PDFKit.PDFDocument, data: ExportData) {
    const { projectName, currency, houseModel, boq, cost, generatedAt } = data;
    const BLUE = '#1a365d';
    const LIGHT_BLUE = '#2b6cb0';
    const GRAY = '#718096';
    const LIGHT_GRAY = '#f7fafc';
    const BLACK = '#1a202c';
    const RED = '#e53e3e';

    // ── Cover / Header ──────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 120).fill(BLUE);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text('BILL OF QUANTITIES', 40, 30);
    doc.fontSize(14).font('Helvetica')
      .text(projectName, 40, 60);
    doc.fontSize(9)
      .text(`Generated: ${generatedAt.toLocaleDateString()} | Wall System: ${boq.wallSystemUsed.replace(/_/g, ' ')}`, 40, 82)
      .text(`Floor Area: ${houseModel.totalFloorArea.toFixed(1)} m² | Floors: ${houseModel.numberOfFloors} | Foundation: ${houseModel.foundationType}`, 40, 96);

    doc.fillColor(BLACK).moveDown(5);

    // ── Disclaimer ──────────────────────────────────────────────────────────
    doc.rect(40, 130, doc.page.width - 80, 28).fill('#fff3cd');
    doc.fillColor('#856404').fontSize(8).font('Helvetica-Bold')
      .text('⚠  NOTICE: This BOQ is for budgeting and planning purposes only. Quantities are calculated from the design model. This document does not constitute an approved specification or certified estimate. Always obtain contractor quotes.', 45, 136, { width: doc.page.width - 90 });

    let y = 168;

    // ── Summary Box ─────────────────────────────────────────────────────────
    doc.rect(40, y, doc.page.width - 80, 55).fill(LIGHT_GRAY).stroke('#e2e8f0');
    doc.fillColor(BLACK).fontSize(10).font('Helvetica-Bold').text('PROJECT SUMMARY', 50, y + 8);
    doc.fontSize(8).font('Helvetica');
    const summaryData = [
      ['Total Floor Area', `${houseModel.totalFloorArea.toFixed(1)} m²`],
      ['Ground Floor Area', `${houseModel.groundFloorArea.toFixed(1)} m²`],
      ['Number of Floors', `${houseModel.numberOfFloors}`],
      ['Wall System', houseModel.wallSystem.replace(/_/g, ' ')],
      ['Roof Type', houseModel.roofType.replace(/_/g, ' ')],
      ['Foundation Type', houseModel.foundationType.replace(/_/g, ' ')],
      ['Total BOQ Items', `${boq.summary.totalItems}`],
    ];
    let sx = 50;
    summaryData.forEach(([label, value], i) => {
      if (i === 4) sx = 280;
      if (i === 4) y += -32;
      doc.fillColor(GRAY).text(label + ':', sx, y + 22 + ((i % 4) * 12), { continued: true }).fillColor(BLACK).text(' ' + value);
    });
    y += 68;

    // ── Cost Summary (if available) ─────────────────────────────────────────
    if (cost && cost.totalCost > 0) {
      y += 8;
      doc.rect(40, y, doc.page.width - 80, 45).fill('#ebf8ff').stroke('#90cdf4');
      doc.fillColor(LIGHT_BLUE).fontSize(10).font('Helvetica-Bold').text('COST SUMMARY', 50, y + 8);
      doc.fontSize(8).font('Helvetica').fillColor(BLACK);
      doc.text(`Total Materials: ${currency} ${cost.totalMaterials.toLocaleString()}`, 50, y + 22);
      doc.text(`Total Labour: ${currency} ${cost.totalLabour.toLocaleString()}`, 50, y + 32);
      doc.text(`TOTAL PROJECT COST: ${currency} ${cost.totalCost.toLocaleString()}`, 200, y + 22, { width: 200 });
      doc.text(`Cost per m²: ${currency} ${cost.costPerSqm.toLocaleString()}`, 200, y + 32);
      y += 55;
    }

    // ── BOQ Line Items by Category ──────────────────────────────────────────
    const categories = [...new Set(boq.items.map((i) => i.category))];

    for (const cat of categories) {
      const catItems = boq.items.filter((i) => i.category === cat);
      if (catItems.length === 0) continue;

      // Check page space
      if (y > doc.page.height - 120) { doc.addPage(); y = 40; }

      // Category header
      doc.rect(40, y, doc.page.width - 80, 18).fill(LIGHT_BLUE);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
        .text(cat.replace(/_/g, ' '), 45, y + 5);
      y += 20;

      // Column headers
      doc.rect(40, y, doc.page.width - 80, 14).fill('#edf2f7');
      doc.fillColor(GRAY).fontSize(7).font('Helvetica-Bold');
      doc.text('Description', 45, y + 4);
      doc.text('Sub-Cat.', 310, y + 4);
      doc.text('Unit', 390, y + 4);
      doc.text('Qty', 430, y + 4);
      y += 16;

      let rowAlt = false;
      for (const item of catItems) {
        if (y > doc.page.height - 80) { doc.addPage(); y = 40; }

        if (rowAlt) doc.rect(40, y, doc.page.width - 80, 13).fill('#f7fafc');
        doc.fillColor(BLACK).fontSize(7).font('Helvetica');
        doc.text(item.description.substring(0, 85), 45, y + 3, { width: 260 });
        doc.text(item.subCategory ?? '', 310, y + 3, { width: 75 });
        doc.text(item.unit, 390, y + 3, { width: 35 });
        doc.text(item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(2), 430, y + 3);

        // Cost if available
        if (cost) {
          const lineItem = cost.lineItems.find((l) => l.boqItemId === item.id);
          if (lineItem && lineItem.totalCost > 0) {
            doc.text(`${lineItem.totalCost.toLocaleString()}`, 460, y + 3);
          }
        }

        y += 14;
        rowAlt = !rowAlt;
      }

      y += 6;
    }

    // ── Warnings ────────────────────────────────────────────────────────────
    if (boq.warnings.length > 0) {
      if (y > doc.page.height - 100) { doc.addPage(); y = 40; }
      doc.fillColor(RED).fontSize(9).font('Helvetica-Bold').text('IMPORTANT NOTES', 40, y); y += 14;
      boq.warnings.forEach((w) => {
        doc.fillColor(BLACK).fontSize(8).font('Helvetica').text(`• ${w}`, 40, y, { width: doc.page.width - 80 }); y += 12;
      });
    }

    // ── Assumptions ─────────────────────────────────────────────────────────
    if (boq.assumptions.length > 0) {
      if (y > doc.page.height - 80) { doc.addPage(); y = 40; }
      y += 8;
      doc.fillColor(GRAY).fontSize(9).font('Helvetica-Bold').text('CALCULATION ASSUMPTIONS', 40, y); y += 14;
      boq.assumptions.forEach((a) => {
        doc.fillColor(GRAY).fontSize(7).font('Helvetica').text(`• ${a}`, 40, y, { width: doc.page.width - 80 }); y += 11;
      });
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const totalPages = (doc as any)._pageBuffer?.length ?? 1;
    doc.fillColor(GRAY).fontSize(7)
      .text('House Design Studio — BOQ Report — For Budgeting Purposes Only', 40, doc.page.height - 25, { width: doc.page.width - 80, align: 'center' });
  }
}

export const pdfExportService = new PDFExportService();
