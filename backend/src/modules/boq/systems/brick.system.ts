import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── Standard Brick Masonry BOQ ──────────────────────────────────────────────
// Standard brick: 230 × 110 × 76mm (coordinating size with 10mm mortar joints)
// Bricks per m²: ~60 (single leaf 110mm wall)
// Half-brick wall (110mm): 60 bricks/m²
// Full brick wall (230mm): 120 bricks/m²
// Mortar: 0.030 m³/m² for single leaf
// Sand (1:4 mix): 0.12 m³/m²; Cement: ~0.8 bags (50kg)/m²

const BRICKS_PER_SQM_SINGLE = 60;
const MORTAR_M3_PER_SQM = 0.030;   // single leaf
const CEMENT_BAGS_PER_M3_MORTAR = 6; // 1:4 mix, 50kg bags
const SAND_M3_PER_M3_MORTAR = 0.9;

export function brickWallBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const wf = 1 + input.wasteFactor;
  const isFullBrick = input.wallThickness >= 0.22;
  const multiplier = isFullBrick ? 2 : 1;
  const wallLabel = isFullBrick ? 'Full brick (230mm)' : 'Half brick (110mm)';

  const bricksTotal = Math.ceil(input.netWallArea * BRICKS_PER_SQM_SINGLE * multiplier * wf);
  const mortarVolume = input.netWallArea * MORTAR_M3_PER_SQM * multiplier * wf;
  const cementBags = Math.ceil(mortarVolume * CEMENT_BAGS_PER_M3_MORTAR);
  const sandM3 = mortarVolume * SAND_M3_PER_M3_MORTAR;

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `${wallLabel} brickwork — ${input.isExternal ? 'external' : 'internal'} walls`,
    unit: 'nr',
    quantity: bricksTotal,
    notes: `Net wall area: ${input.netWallArea.toFixed(1)} m² @ ${BRICKS_PER_SQM_SINGLE * multiplier} bricks/m² + ${(input.wasteFactor * 100).toFixed(0)}% waste`,
    sortOrder: startSortOrder,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Mortar for brickwork — ${input.isExternal ? 'external' : 'internal'} walls (1:4 cement:sand)`,
    unit: 'm³',
    quantity: parseFloat(mortarVolume.toFixed(3)),
    sortOrder: startSortOrder + 1,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Cement (50kg bags) for brickwork mortar`,
    unit: 'bag',
    quantity: cementBags,
    sortOrder: startSortOrder + 2,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Sand for brickwork mortar`,
    unit: 'm³',
    quantity: parseFloat(sandM3.toFixed(2)),
    sortOrder: startSortOrder + 3,
  });

  if (input.isExternal) {
    const dpcLength = Math.ceil(input.grossWallArea / 2.8 * 1.05); // approximate lineal m at DPC level
    items.push({
      id: uuid(),
      category: 'SUBSTRUCTURE',
      subCategory: 'DPC',
      description: `Damp Proof Course (DPC) — 255mm wide polythene @ 200mm above ground`,
      unit: 'm',
      quantity: dpcLength,
      notes: 'Estimated from wall area ÷ floor height',
      sortOrder: startSortOrder + 4,
    });
  }

  return items;
}
