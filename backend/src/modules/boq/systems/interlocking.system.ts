import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── Interlocking Concrete Block System BOQ ───────────────────────────────────
// Block size: 300 × 150 × 150mm (typical interlocking hollow block)
// Blocks per m² = ~22
// Minimal mortar: bed joints only (no perpend joints)
// 40% less mortar than standard blockwork
// Reinforced cells: filled with concrete + Y10 bar at corners and openings

const BLOCKS_PER_SQM = 22;
const MORTAR_M3_PER_SQM = 0.008;       // bed joints only
const CEMENT_BAGS_PER_M3 = 8;          // 1:3 mix
const SAND_M3_PER_M3_MORTAR = 0.85;
const GROUT_M3_PER_SQM_CELLS = 0.012;  // for filled reinforced cells

export function interlockingBlockBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const wf = 1 + input.wasteFactor;

  const blocksTotal = Math.ceil(input.netWallArea * BLOCKS_PER_SQM * wf);
  const mortarVol = input.netWallArea * MORTAR_M3_PER_SQM * wf;
  const cementBags = Math.ceil(mortarVol * CEMENT_BAGS_PER_M3);
  const sandM3 = mortarVol * SAND_M3_PER_M3_MORTAR;

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Interlocking hollow concrete blocks (300×150×150mm) — ${input.isExternal ? 'external' : 'internal'} walls`,
    unit: 'nr',
    quantity: blocksTotal,
    notes: `Net wall area: ${input.netWallArea.toFixed(1)} m² @ ${BLOCKS_PER_SQM} blocks/m²`,
    sortOrder: startSortOrder,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Mortar (1:3 mix) for bed joints only in interlocking blockwork`,
    unit: 'm³',
    quantity: parseFloat(mortarVol.toFixed(3)),
    sortOrder: startSortOrder + 1,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Cement (50kg bags) for mortar`,
    unit: 'bag',
    quantity: cementBags,
    sortOrder: startSortOrder + 2,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Sand for mortar`,
    unit: 'm³',
    quantity: parseFloat(sandM3.toFixed(2)),
    sortOrder: startSortOrder + 3,
  });

  // ── Reinforced and Grouted Cells at corners/openings ──────────────────────
  const groutVol = parseFloat((input.netWallArea * GROUT_M3_PER_SQM_CELLS * wf).toFixed(3));
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'REINFORCEMENT',
    description: `Concrete grout (1:2:3 mix) to reinforced cells at corners and jambs`,
    unit: 'm³',
    quantity: groutVol,
    sortOrder: startSortOrder + 4,
  });

  const wallHeight = 2.8;
  const perimEst = input.grossWallArea / wallHeight;
  const rebarLinM = Math.ceil(perimEst * 0.5 * wallHeight * wf); // Y10 bars at reinforced cells
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'REINFORCEMENT',
    description: `Y10 vertical reinforcement bars in grouted cells`,
    unit: 'kg',
    quantity: Math.ceil(rebarLinM * 0.617), // Y10 = 0.617 kg/m
    sortOrder: startSortOrder + 5,
  });

  return items;
}
