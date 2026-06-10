import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── Glass Curtain Wall System BOQ ────────────────────────────────────────────
// Unitised or stick curtain wall system
// Aluminium mullions and transoms forming grid
// Double-glazed units (DGU): 6mm + 12mm cavity + 6mm = 24mm
// Opaque spandrel panels at floor lines
// Opening vents (casements) at ~15% of glass area

const ALUMINIUM_KG_PER_SQM_FRAME = 6.5;  // mullion + transom per m² of facade
const GLASS_COVERAGE_FACTOR = 0.85;       // 85% of facade is glass, 15% frame/spandrel
const SEALANT_M_PER_SQM = 3.5;           // linear metres of silicone sealant per m² facade
const THERMAL_BREAK_M_PER_SQM = 2.0;     // thermal break strip lineal per m²

export function glassCurtainWallBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const wf = 1 + input.wasteFactor;

  const facadeArea = input.grossWallArea; // total curtain wall area
  const glazedArea = facadeArea * GLASS_COVERAGE_FACTOR * wf;
  const spandrelArea = facadeArea * (1 - GLASS_COVERAGE_FACTOR) * wf;
  const openingVentArea = glazedArea * 0.15; // 15% opening vents

  // ── Aluminium Frame System ─────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'GLASS_SYSTEMS',
    subCategory: 'CURTAIN_WALL_FRAME',
    description: `Aluminium curtain wall frame system — mullions, transoms, brackets, thermal break extrusions`,
    unit: 'kg',
    quantity: Math.ceil(facadeArea * ALUMINIUM_KG_PER_SQM_FRAME * wf),
    notes: `Facade area: ${facadeArea.toFixed(1)} m². Unitised or stick system as specified.`,
    sortOrder: startSortOrder,
  });

  // ── Double Glazed Units ────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'GLASS_SYSTEMS',
    subCategory: 'GLAZING',
    description: `Double glazed units (DGU) 6/12/6 clear float glass — fixed lights`,
    unit: 'm²',
    quantity: parseFloat((glazedArea - openingVentArea).toFixed(2)),
    sortOrder: startSortOrder + 1,
  });

  // ── Opening Vent DGUs ──────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'GLASS_SYSTEMS',
    subCategory: 'GLAZING',
    description: `DGU 6/12/6 for opening vent casements (15% of glazed area)`,
    unit: 'm²',
    quantity: parseFloat(openingVentArea.toFixed(2)),
    sortOrder: startSortOrder + 2,
  });

  // ── Spandrel Panels ────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'GLASS_SYSTEMS',
    subCategory: 'SPANDREL',
    description: `Opaque spandrel panels (insulated aluminium composite or fritted glass) at floor lines`,
    unit: 'm²',
    quantity: parseFloat(spandrelArea.toFixed(2)),
    sortOrder: startSortOrder + 3,
  });

  // ── Sealants ───────────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'GLASS_SYSTEMS',
    subCategory: 'SEALANTS',
    description: `Structural silicone sealant and weathering silicone for all joints`,
    unit: 'm',
    quantity: Math.ceil(facadeArea * SEALANT_M_PER_SQM * wf),
    sortOrder: startSortOrder + 4,
  });

  // ── Thermal Break ──────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'GLASS_SYSTEMS',
    subCategory: 'INSULATION',
    description: `Thermal break polyamide strip inserts for aluminium extrusions`,
    unit: 'm',
    quantity: Math.ceil(facadeArea * THERMAL_BREAK_M_PER_SQM * wf),
    sortOrder: startSortOrder + 5,
  });

  // ── Anchor System ──────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'GLASS_SYSTEMS',
    subCategory: 'FIXINGS',
    description: `Curtain wall anchor brackets and stainless steel fixings to structural frame`,
    unit: 'set',
    quantity: Math.ceil(facadeArea / 1.5), // approx one anchor per 1.5m² of facade
    notes: 'Structural engineer to confirm anchor design and loads.',
    sortOrder: startSortOrder + 6,
  });

  return items;
}
