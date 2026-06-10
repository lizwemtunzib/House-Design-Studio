import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── Concrete Block Masonry BOQ ───────────────────────────────────────────────
// Standard hollow block: 400 × 200 × 200mm
// Blocks per m² = 12.5 (400×200 face)
// Mortar: ~0.015 m³/m² (thin joints compared to brick)
// Cement bags: ~4 bags per m² (including grout for hollow cores if filled)

const BLOCKS_PER_SQM = 12.5;       // 400×200mm face
const MORTAR_M3_PER_SQM = 0.015;
const CEMENT_BAGS_PER_M3 = 7;      // 1:3 mix
const SAND_M3_PER_M3_MORTAR = 0.85;

// Reinforced block columns: at corners and every 3m (for seismic/structural)
const REBAR_KG_PER_COLUMN = 15;    // per lineal metre of column

export function blockWallBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
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
    description: `Hollow concrete blocks (400×200×200mm) — ${input.isExternal ? 'external' : 'internal'} walls`,
    unit: 'nr',
    quantity: blocksTotal,
    notes: `Net wall area: ${input.netWallArea.toFixed(1)} m² @ ${BLOCKS_PER_SQM} blocks/m²`,
    sortOrder: startSortOrder,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Mortar (1:3 mix) for blockwork`,
    unit: 'm³',
    quantity: parseFloat(mortarVol.toFixed(3)),
    sortOrder: startSortOrder + 1,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Cement (50kg bags) for blockwork mortar`,
    unit: 'bag',
    quantity: cementBags,
    sortOrder: startSortOrder + 2,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Sand for blockwork mortar`,
    unit: 'm³',
    quantity: parseFloat(sandM3.toFixed(2)),
    sortOrder: startSortOrder + 3,
  });

  if (input.isExternal) {
    // Ring beam reinforcement along top of walls
    const wallHeight = 2.8;
    const perimEst = input.grossWallArea / wallHeight;
    const ringBeamLinM = perimEst;
    const rebarKg = Math.ceil(ringBeamLinM * 3 * 0.888); // 3 × Y12 bars @0.888 kg/m
    const stirrupKg = Math.ceil(ringBeamLinM / 0.2 * 0.395); // Y8 links @200mm c/c

    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'RING_BEAM',
      description: `Ring beam — concrete (1:2:4 mix) in blockwork bond beam`,
      unit: 'm³',
      quantity: parseFloat((ringBeamLinM * 0.2 * 0.2).toFixed(2)),
      sortOrder: startSortOrder + 4,
    });

    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'RING_BEAM',
      description: `Ring beam reinforcement — Y12 main bars`,
      unit: 'kg',
      quantity: rebarKg,
      sortOrder: startSortOrder + 5,
    });

    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'RING_BEAM',
      description: `Ring beam reinforcement — Y8 stirrups @ 200mm c/c`,
      unit: 'kg',
      quantity: stirrupKg,
      sortOrder: startSortOrder + 6,
    });
  }

  return items;
}
