import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── Light Gauge Steel Frame Wall System BOQ ──────────────────────────────────
// C-sections (studs): 89×41×12mm C-section at 600mm c/c
// U-channels (tracks): 92×41mm at top and bottom
// Weight: ~8–12 kg/m² of wall
// External: fibre cement board or brick veneer on frame
// Internal: plasterboard 12mm

const STUD_SPACING_MM = 600;
const STUD_WEIGHT_KG_PER_LM = 1.38;    // 89×41×12 LGS C-section
const TRACK_WEIGHT_KG_PER_LM = 1.15;
const SCREW_KG_PER_SQM = 0.05;         // self-tapping screws

export function steelFrameWallBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const wf = 1 + input.wasteFactor;

  const wallHeight = 2.8;
  const wallArea = input.netWallArea;
  const wallWidth = wallArea / wallHeight;

  // ── Steel Studs ────────────────────────────────────────────────────────────
  const studCount = Math.ceil((wallWidth / (STUD_SPACING_MM / 1000)) + 1);
  const studLinM = studCount * wallHeight * wf;
  const studKg = studLinM * STUD_WEIGHT_KG_PER_LM;

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Light gauge steel C-section studs 89×41×12mm @ ${STUD_SPACING_MM}mm c/c — ${input.isExternal ? 'external' : 'internal'} frame`,
    unit: 'kg',
    quantity: Math.ceil(studKg),
    notes: `Wall area: ${wallArea.toFixed(1)} m²`,
    sortOrder: startSortOrder,
  });

  // ── Tracks (top & bottom) ──────────────────────────────────────────────────
  const trackLinM = wallWidth * 2.5 * wf; // top + bottom + splicing
  const trackKg = trackLinM * TRACK_WEIGHT_KG_PER_LM;

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Light gauge steel U-channel track 92×41mm — top and bottom tracks`,
    unit: 'kg',
    quantity: Math.ceil(trackKg),
    sortOrder: startSortOrder + 1,
  });

  // ── Bridging / Bracing ─────────────────────────────────────────────────────
  const bridgingKg = Math.ceil(wallArea * 1.2 * wf); // approx 1.2 kg/m²
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Steel bridging channels and flat strap bracing for LGS frame`,
    unit: 'kg',
    quantity: bridgingKg,
    sortOrder: startSortOrder + 2,
  });

  // ── Screws and Connectors ──────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Self-tapping hex-head screws (Tek screws) for LGS assembly`,
    unit: 'kg',
    quantity: parseFloat((wallArea * SCREW_KG_PER_SQM * wf).toFixed(2)),
    sortOrder: startSortOrder + 3,
  });

  if (input.isExternal) {
    // ── External Cladding (fibre cement) ──────────────────────────────────
    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'CLADDING',
      description: `External fibre cement board cladding (9mm) on LGS frame`,
      unit: 'm²',
      quantity: Math.ceil(wallArea * wf),
      sortOrder: startSortOrder + 4,
    });

    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'INSULATION',
      description: `Rockwool insulation batts (89mm) between LGS studs`,
      unit: 'm²',
      quantity: Math.ceil(wallArea * wf),
      sortOrder: startSortOrder + 5,
    });

    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'CLADDING',
      description: `Vapour control layer (VCL) membrane to internal warm face`,
      unit: 'm²',
      quantity: Math.ceil(wallArea * wf),
      sortOrder: startSortOrder + 6,
    });
  }

  // ── Internal Lining ────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'INTERNAL_FINISHES',
    subCategory: 'LININGS',
    description: `12.5mm gypsum plasterboard lining to internal face of LGS frame`,
    unit: 'm²',
    quantity: Math.ceil(wallArea * wf),
    sortOrder: startSortOrder + 7,
  });

  return items;
}
