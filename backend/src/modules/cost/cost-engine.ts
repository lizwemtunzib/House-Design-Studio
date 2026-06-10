import { BOQResult, BOQLineItem } from '../boq/boq.types';
import {
  PriceInputItem, CostResult, CostBreakdownCategory, CostLineItem,
} from './cost.types';

// ─── Cost Engine ──────────────────────────────────────────────────────────────
// DETERMINISTIC — multiplies BOQ quantities by user-supplied unit prices.
// No AI, no estimation. The user owns the accuracy of their unit prices.

export class CostEngine {
  calculate(
    boq: BOQResult,
    priceInputs: PriceInputItem[],
    floorArea: number,
    currency = 'USD',
  ): CostResult {
    const priceMap = new Map<string, PriceInputItem>();
    for (const p of priceInputs) {
      priceMap.set(p.boqItemId, p);
    }

    const lineItems: CostLineItem[] = [];
    const categoryMap = new Map<string, CostBreakdownCategory>();

    for (const item of boq.items) {
      const priceInput = priceMap.get(item.id);
      const unitPrice = priceInput?.unitPrice ?? 0;
      const labourRate = priceInput?.labourRate ?? 0;

      const materialsCost = item.quantity * unitPrice;
      const labourCost = item.quantity * labourRate;
      const totalCost = materialsCost + labourCost;

      lineItems.push({
        boqItemId: item.id,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice,
        labourRate,
        materialsCost: round2(materialsCost),
        labourCost: round2(labourCost),
        totalCost: round2(totalCost),
        category: item.category,
      });

      // Accumulate category totals
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, {
          category: item.category,
          materialsCost: 0,
          labourCost: 0,
          totalCost: 0,
          percentage: 0,
          itemCount: 0,
        });
      }
      const cat = categoryMap.get(item.category)!;
      cat.materialsCost += materialsCost;
      cat.labourCost += labourCost;
      cat.totalCost += totalCost;
      cat.itemCount++;
    }

    const totalMaterials = round2(lineItems.reduce((s, i) => s + i.materialsCost, 0));
    const totalLabour = round2(lineItems.reduce((s, i) => s + i.labourCost, 0));
    const totalCost = round2(totalMaterials + totalLabour);
    const costPerSqm = floorArea > 0 ? round2(totalCost / floorArea) : 0;

    // Calculate percentages
    const breakdown = Array.from(categoryMap.values()).map((cat) => ({
      ...cat,
      materialsCost: round2(cat.materialsCost),
      labourCost: round2(cat.labourCost),
      totalCost: round2(cat.totalCost),
      percentage: totalCost > 0 ? round2((cat.totalCost / totalCost) * 100) : 0,
    }));

    // Sort by total cost descending
    breakdown.sort((a, b) => b.totalCost - a.totalCost);

    const mostExpensiveCategory = breakdown[0]?.category ?? '';
    const labourToMaterialRatio = totalMaterials > 0 ? round2(totalLabour / totalMaterials) : 0;

    // Confidence assessment
    const itemsWithPrices = lineItems.filter((i) => i.unitPrice > 0).length;
    const coverageRatio = boq.items.length > 0 ? itemsWithPrices / boq.items.length : 0;
    const confidence = coverageRatio >= 0.9 ? 'HIGH' : coverageRatio >= 0.6 ? 'MEDIUM' : 'LOW';

    const notes: string[] = [];
    if (confidence !== 'HIGH') {
      notes.push(`${(100 - coverageRatio * 100).toFixed(0)}% of BOQ items have no price input — total may be understated.`);
    }
    if (totalCost === 0) {
      notes.push('No unit prices entered yet. Add prices to each BOQ line item to calculate costs.');
    }
    notes.push('Cost estimate is based on user-provided unit prices only. Quantities are deterministic.');
    notes.push('This estimate is for budgeting purposes only. Obtain contractor quotes for final pricing.');

    return {
      boqId: boq.modelId,
      currency,
      totalMaterials,
      totalLabour,
      totalCost,
      costPerSqm,
      floorArea,
      breakdown,
      lineItems,
      summary: {
        mostExpensiveCategory,
        labourToMaterialRatio,
        estimateConfidence: confidence,
        notes,
      },
    };
  }

  // Generates a set of reference/benchmark unit prices for a given region.
  // These are GUIDANCE only — user should override with real local prices.
  getBenchmarkPrices(region: 'AFRICA' | 'MIDDLE_EAST' | 'EUROPE' | 'USA' | 'ASIA', currency: string): Record<string, number> {
    const benchmarks: Record<string, Record<string, number>> = {
      AFRICA: {
        'm³_concrete': 120,
        'nr_brick': 0.18,
        'nr_block': 1.20,
        'nr_makiga_block': 0.35,
        'm²_roof_tile': 8,
        'm²_floor_tile': 12,
        'm²_plaster': 4,
        'nr_door': 180,
        'nr_window': 120,
        'kg_rebar': 0.95,
        'm²_paint': 2.50,
        'm_gutter': 6,
      },
      MIDDLE_EAST: {
        'm³_concrete': 180,
        'nr_brick': 0.45,
        'nr_block': 2.80,
        'm²_roof_tile': 18,
        'm²_floor_tile': 25,
        'm²_plaster': 9,
        'nr_door': 350,
        'nr_window': 280,
        'kg_rebar': 1.20,
        'm²_paint': 4.50,
        'm_gutter': 12,
      },
      EUROPE: {
        'm³_concrete': 280,
        'nr_brick': 0.60,
        'nr_block': 3.50,
        'm²_roof_tile': 35,
        'm²_floor_tile': 45,
        'm²_plaster': 22,
        'nr_door': 650,
        'nr_window': 520,
        'kg_rebar': 1.80,
        'm²_paint': 8.00,
        'm_gutter': 22,
      },
      USA: {
        'm³_concrete': 320,
        'nr_brick': 0.75,
        'nr_block': 4.20,
        'm²_roof_tile': 42,
        'm²_floor_tile': 55,
        'm²_plaster': 28,
        'nr_door': 780,
        'nr_window': 620,
        'kg_rebar': 2.10,
        'm²_paint': 10.00,
        'm_gutter': 28,
      },
      ASIA: {
        'm³_concrete': 150,
        'nr_brick': 0.22,
        'nr_block': 1.50,
        'm²_roof_tile': 12,
        'm²_floor_tile': 18,
        'm²_plaster': 6,
        'nr_door': 220,
        'nr_window': 160,
        'kg_rebar': 1.10,
        'm²_paint': 3.50,
        'm_gutter': 8,
      },
    };

    return benchmarks[region] ?? benchmarks['AFRICA'];
  }
}

export const costEngine = new CostEngine();

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
