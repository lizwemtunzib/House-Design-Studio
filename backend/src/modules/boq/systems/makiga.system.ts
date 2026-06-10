import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── Makiga / Soil-Stabilised Interlocking Block BOQ ─────────────────────────
// Block size: 290 × 140 × 90mm (typical Makiga CSEB - Compressed Stabilised Earth Block)
// Blocks per m² = ~25 (single leaf)
// Soil-cement mix: typically 8–10% OPC by volume
// No mortar joints needed for interlocking system (dry-stacking)
// Foundation: standard strip, slightly wider base required
// Key advantage: up to 60% cheaper than fired brick in sub-Saharan Africa

const BLOCKS_PER_SQM = 25;
const SOIL_M3_PER_1000_BLOCKS = 3.5;      // loose soil volume
const CEMENT_BAGS_PER_1000_BLOCKS = 18;   // at 8% OPC content, 50kg bags
const WATER_LITRES_PER_1000_BLOCKS = 180;

// Interface mortar (used at corners / special joints only)
const MORTAR_M3_PER_SQM_SPECIAL = 0.005;

export function makigaWallBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const wf = 1 + input.wasteFactor;

  const blocksTotal = Math.ceil(input.netWallArea * BLOCKS_PER_SQM * wf);
  const blocksK = blocksTotal / 1000;

  const soilM3 = parseFloat((blocksK * SOIL_M3_PER_1000_BLOCKS).toFixed(2));
  const cementBags = Math.ceil(blocksK * CEMENT_BAGS_PER_1000_BLOCKS);
  const waterLitres = Math.ceil(blocksK * WATER_LITRES_PER_1000_BLOCKS);

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Makiga/CSEB interlocking soil-stabilised blocks — ${input.isExternal ? 'external' : 'internal'} walls`,
    unit: 'nr',
    quantity: blocksTotal,
    notes: `Net wall area: ${input.netWallArea.toFixed(1)} m² @ ${BLOCKS_PER_SQM} blocks/m² + ${(input.wasteFactor * 100).toFixed(0)}% waste. Africa-friendly low-cost system.`,
    sortOrder: startSortOrder,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Suitable local soil for CSEB block production (screened, no clay lumps)`,
    unit: 'm³',
    quantity: soilM3,
    sortOrder: startSortOrder + 1,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `OPC cement (50kg bags) for CSEB block stabilisation (8% by volume)`,
    unit: 'bag',
    quantity: cementBags,
    sortOrder: startSortOrder + 2,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Water for block compaction and curing`,
    unit: 'litre',
    quantity: waterLitres,
    sortOrder: startSortOrder + 3,
  });

  // Corner and special interface mortar
  const specialMortarM3 = parseFloat((input.netWallArea * MORTAR_M3_PER_SQM_SPECIAL).toFixed(3));
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Cement mortar (1:3) for corners, lintels and special block interfaces`,
    unit: 'm³',
    quantity: specialMortarM3,
    sortOrder: startSortOrder + 4,
  });

  // Makiga machine hire note (one-time cost item)
  items.push({
    id: uuid(),
    category: 'PRELIMINARY',
    subCategory: 'PLANT',
    description: `Makiga block press machine hire (or purchase allowance) for block production`,
    unit: 'lump',
    quantity: 1,
    notes: 'Hire or purchase cost depending on project scale. 1 machine produces ~500 blocks/day.',
    sortOrder: startSortOrder + 5,
  });

  return items;
}
