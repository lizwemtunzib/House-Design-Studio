import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── SIP Panel (Structural Insulated Panel) BOQ ───────────────────────────────
// Standard SIP: 165mm total (11mm OSB + 143mm EPS + 11mm OSB)
// Panels supplied in 1220mm or 2440mm wide × floor height
// No additional studs/framing required
// Splines (timber or LVL) at panel joints
// Bottom plate: 90×45mm CCA treated timber
// Top plate: 90×45mm CCA treated timber

const PANEL_WIDTH_MM = 1220;
const OSB_THICKNESS_MM = 11; // each face
const EPS_THICKNESS_MM = 143;

export function sipPanelBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const wf = 1 + input.wasteFactor;

  const wallHeight = 2.8;
  const wallArea = input.netWallArea;
  const wallWidth = wallArea / wallHeight;
  const numberOfPanels = Math.ceil((wallWidth / (PANEL_WIDTH_MM / 1000)) * wf);
  const sipAreaTotal = parseFloat((wallArea * wf).toFixed(2));

  // ── SIP Panels ─────────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `SIP panels — 165mm (11mm OSB + 143mm EPS + 11mm OSB), ${PANEL_WIDTH_MM}mm wide × ${(wallHeight * 1000).toFixed(0)}mm high`,
    unit: 'm²',
    quantity: sipAreaTotal,
    notes: `Approx ${numberOfPanels} panels for ${input.isExternal ? 'external' : 'internal'} walls. Pre-cut to size or cut on site.`,
    sortOrder: startSortOrder,
  });

  // ── Splines ────────────────────────────────────────────────────────────────
  const splineLinM = Math.ceil(numberOfPanels * wallHeight * wf);
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `LVL (Laminated Veneer Lumber) splines at SIP panel joints — 63×143mm`,
    unit: 'm',
    quantity: splineLinM,
    sortOrder: startSortOrder + 1,
  });

  // ── Bottom Plates ──────────────────────────────────────────────────────────
  const plateLinM = Math.ceil(wallWidth * 1.1 * wf);
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Bottom plate — 90×45mm CCA treated timber, double layer`,
    unit: 'm',
    quantity: plateLinM * 2,
    sortOrder: startSortOrder + 2,
  });

  // ── Top Plates ─────────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Top plate — 90×45mm CCA treated timber`,
    unit: 'm',
    quantity: Math.ceil(wallWidth * 1.05 * wf),
    sortOrder: startSortOrder + 3,
  });

  // ── SIP Screws and Adhesive ────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'FIXINGS',
    description: `SIP screws (long shank 280mm) for panel-to-plate and panel-to-spline connections`,
    unit: 'nr',
    quantity: Math.ceil(wallArea * 2.5 * wf), // approx 2.5 screws/m²
    sortOrder: startSortOrder + 4,
  });

  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'FIXINGS',
    description: `Expanding foam sealant (polyurethane) to all SIP joints`,
    unit: 'nr',
    quantity: Math.ceil(numberOfPanels * 1.5), // ~1.5 cans per panel joint
    notes: 'Critical for airtightness. Do not skip.',
    sortOrder: startSortOrder + 5,
  });

  if (input.isExternal) {
    // ── Breather Paper ─────────────────────────────────────────────────────
    items.push({
      id: uuid(),
      category: 'SUPERSTRUCTURE',
      subCategory: 'MEMBRANES',
      description: `Breather paper/membrane to external face of SIP`,
      unit: 'm²',
      quantity: Math.ceil(wallArea * wf),
      sortOrder: startSortOrder + 6,
    });
  }

  return items;
}
