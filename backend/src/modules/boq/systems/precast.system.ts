import { BOQLineItem, WallCalculationInput } from '../boq.types';
import { v4 as uuid } from 'uuid';

// ─── Precast Concrete Panel BOQ ───────────────────────────────────────────────
// Precast tilt-up or factory-made panels
// Typical thickness: 150–200mm (solid) or insulated sandwich (100mm conc + 50mm EPS + 100mm conc)
// Panels craned into position and bolted to foundation
// Panel-to-panel: welded cast-in connections or bolted splice plates
// Grout: non-shrink at joints and base connections

const PANEL_THICKNESS_MM = 150;
const CONCRETE_VOLUME_M3_PER_SQM = 0.15; // 150mm solid panel
const REBAR_KG_PER_SQM = 18;             // double layer mesh
const CRANE_LIFTS_PER_PANEL_AREA = 0.04; // 1 lift per 25 m² of panel
const GROUT_KG_PER_LM_JOINT = 5;        // non-shrink grout per linear metre of joint

export function precastPanelBOQ(input: WallCalculationInput, startSortOrder = 0): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const wf = 1 + input.wasteFactor;

  const panelArea = input.grossWallArea;

  // ── Concrete Volume ────────────────────────────────────────────────────────
  const concreteM3 = parseFloat((panelArea * CONCRETE_VOLUME_M3_PER_SQM * wf).toFixed(2));
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Precast concrete wall panels — ${PANEL_THICKNESS_MM}mm thick, C30/37 concrete`,
    unit: 'm³',
    quantity: concreteM3,
    notes: `Total panel area: ${panelArea.toFixed(1)} m². Factory-cast or tilt-up on site.`,
    sortOrder: startSortOrder,
  });

  // ── Reinforcement ──────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'WALLING',
    description: `Reinforcement mesh (BRC A252 or similar) for precast panels`,
    unit: 'kg',
    quantity: Math.ceil(panelArea * REBAR_KG_PER_SQM * wf),
    sortOrder: startSortOrder + 1,
  });

  // ── Cast-in Fixings ────────────────────────────────────────────────────────
  const numPanels = Math.ceil(panelArea / 12); // ~12 m² per panel
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'FIXINGS',
    description: `Cast-in lifting anchors and connection plates for precast panels`,
    unit: 'set',
    quantity: numPanels,
    notes: 'Structural engineer to specify cast-in anchor design per panel weight.',
    sortOrder: startSortOrder + 2,
  });

  // ── Crane Lifts ────────────────────────────────────────────────────────────
  const craneLifts = Math.ceil(panelArea * CRANE_LIFTS_PER_PANEL_AREA);
  items.push({
    id: uuid(),
    category: 'PRELIMINARY',
    subCategory: 'PLANT',
    description: `Mobile crane hire for precast panel erection (${craneLifts} lifts estimated)`,
    unit: 'lump',
    quantity: 1,
    notes: 'Quote from specialist crane company. Rigging and dogman included.',
    sortOrder: startSortOrder + 3,
  });

  // ── Panel-to-Panel Connections ─────────────────────────────────────────────
  const jointLinM = (panelArea / 3.0); // approx joint length per 3m panel height
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'CONNECTIONS',
    description: `Panel-to-panel connection plates (welded or bolted splice) at vertical joints`,
    unit: 'set',
    quantity: Math.ceil(jointLinM / 0.6),
    sortOrder: startSortOrder + 4,
  });

  // ── Non-shrink Grout ──────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'SUPERSTRUCTURE',
    subCategory: 'GROUTING',
    description: `Non-shrink cementitious grout at panel base plates and joint fills`,
    unit: 'kg',
    quantity: Math.ceil(jointLinM * GROUT_KG_PER_LM_JOINT),
    sortOrder: startSortOrder + 5,
  });

  // ── Joint Sealant ─────────────────────────────────────────────────────────
  items.push({
    id: uuid(),
    category: 'EXTERNAL_FINISHES',
    subCategory: 'SEALANTS',
    description: `Polyurethane joint sealant to all panel-to-panel and panel-to-slab joints`,
    unit: 'm',
    quantity: Math.ceil(jointLinM * 1.1),
    sortOrder: startSortOrder + 6,
  });

  return items;
}
