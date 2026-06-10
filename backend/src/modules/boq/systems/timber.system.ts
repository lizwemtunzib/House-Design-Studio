import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── Timber Frame Wall System BOQ ─────────────────────────────────────────────
// Standard platform frame: 90×45mm studs at 450mm c/c
// Top and bottom plates: 90×45mm
// Nogging (blocking): 90×45mm at mid-height
// External sheathing: 9mm OSB or timber board
// Internal lining: 12mm plasterboard (gypsum)
// Insulation: glass wool or rockwool batts between studs

const STUD_SPACING_MM = 450;
const STUD_SIZE = '90×45mm';
const PLATE_SIZE = '90×45mm';
const SHEATHING_THICKNESS_MM = 9;   // OSB
const LINING_THICKNESS_MM = 12;     // gypsum board

export function timberFrameWallBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const wf = 1 + input.wasteFactor;

  const wallHeight = 2.8; // default, overridden per project if needed
  const wallArea = input.netWallArea;
  const wallWidth = wallArea / wallHeight; // approximate lineal metres of wall

  // ── Studs ──────────────────────────────────────────────────────────────────
  const studCount = Math.ceil((wallWidth / (STUD_SPACING_MM / 1000)) + 1) * (1 + input.wasteFactor);
  const studLinM = studCount * wallHeight;

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Timber studs ${STUD_SIZE} @ ${STUD_SPACING_MM}mm c/c — ${input.isExternal ? 'external' : 'internal'} frame`,
    unit: 'm',
    quantity: Math.ceil(studLinM),
    notes: `Wall area: ${wallArea.toFixed(1)} m²`,
    sortOrder: startSortOrder,
  });

  // ── Top & Bottom Plates ────────────────────────────────────────────────────
  const plateLinM = wallWidth * 3 * wf; // top + bottom + 1 extra (split plates)
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Timber plates ${PLATE_SIZE} — top, bottom and fire blocking`,
    unit: 'm',
    quantity: Math.ceil(plateLinM),
    sortOrder: startSortOrder + 1,
  });

  // ── Noggings / Blocking ────────────────────────────────────────────────────
  const noggingLinM = Math.ceil(wallWidth * 1.1 * wf);
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Timber noggings ${STUD_SIZE} (horizontal blocking at mid-height)`,
    unit: 'm',
    quantity: noggingLinM,
    sortOrder: startSortOrder + 2,
  });

  // ── Connector Plates & Framing Nails ──────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Galvanised framing nails (90mm) and hurricane ties for timber frame`,
    unit: 'kg',
    quantity: Math.ceil(wallArea * 0.3 * wf),
    sortOrder: startSortOrder + 3,
  });

  if (input.isExternal) {
    // ── External Sheathing ─────────────────────────────────────────────────
    const sheathingSqm = Math.ceil(wallArea * wf);
    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'SHEATHING',
      description: `External wall sheathing — ${SHEATHING_THICKNESS_MM}mm OSB board (Oriented Strand Board)`,
      unit: 'm²',
      quantity: sheathingSqm,
      sortOrder: startSortOrder + 4,
    });

    // ── Breather Membrane ──────────────────────────────────────────────────
    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'SHEATHING',
      description: `Breather membrane (vapour-permeable house wrap) to external face`,
      unit: 'm²',
      quantity: sheathingSqm,
      sortOrder: startSortOrder + 5,
    });

    // ── Insulation ─────────────────────────────────────────────────────────
    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'INSULATION',
      description: `Glass wool / rockwool insulation batts between studs (90mm depth)`,
      unit: 'm²',
      quantity: sheathingSqm,
      sortOrder: startSortOrder + 6,
    });
  }

  // ── Internal Lining ────────────────────────────────────────────────────────
  const liningSqm = Math.ceil(wallArea * wf);
  items.push({
    id: uuid(),
    category: 'INTERNAL_FINISHES',
    subCategory: 'LININGS',
    description: `Gypsum plasterboard lining (${LINING_THICKNESS_MM}mm) to internal face of timber frame`,
    unit: 'm²',
    quantity: liningSqm,
    sortOrder: startSortOrder + 7,
  });

  items.push({
    id: uuid(),
    category: 'INTERNAL_FINISHES',
    subCategory: 'LININGS',
    description: `Joint compound and tape for plasterboard joints`,
    unit: 'm²',
    quantity: liningSqm,
    sortOrder: startSortOrder + 8,
  });

  return items;
}
