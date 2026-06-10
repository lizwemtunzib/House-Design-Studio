// ─── BOQ Types ───────────────────────────────────────────────────────────────

export type BOQCategory =
  | 'PRELIMINARY'
  | 'EXCAVATION'
  | 'SUBSTRUCTURE'
  | 'SUPERSTRUCTURE'
  | 'ROOFING'
  | 'WINDOWS_DOORS'
  | 'INTERNAL_FINISHES'
  | 'EXTERNAL_FINISHES'
  | 'PLUMBING_SANITARYWARE'
  | 'ELECTRICAL_CONDUITS'
  | 'EXTERNAL_WORKS'
  | 'LANDSCAPING'
  | 'GLASS_SYSTEMS';

export type BOQUnit = 'm³' | 'm²' | 'm' | 'nr' | 'kg' | 'bag' | 'tonne' | 'litre' | 'set' | 'lump';

export interface BOQLineItem {
  id: string;
  category: BOQCategory;
  subCategory: string;
  description: string;
  unit: BOQUnit;
  quantity: number;
  notes?: string;
  sortOrder: number;
}

export interface BOQResult {
  modelId: string;
  version: number;
  wallSystemUsed: string;
  items: BOQLineItem[];
  summary: {
    totalItems: number;
    byCategory: Record<BOQCategory, number>;  // item count per category
  };
  warnings: string[];   // e.g., "Pool BOQ requires specialist contractor"
  assumptions: string[]; // stated assumptions for transparency
}

// ─── Calculation Input for each system ───────────────────────────────────────

export interface WallCalculationInput {
  netWallArea: number;          // m² (after deducting openings)
  grossWallArea: number;        // m² (before deducting openings)
  wallThickness: number;        // metres
  isExternal: boolean;
  wasteFactor: number;          // e.g. 0.05 = 5%
}

export interface FoundationCalculationInput {
  perimeterLength: number;      // m
  foundationType: string;
  foundationWidth: number;      // m (typically 0.4–0.6m)
  foundationDepth: number;      // m (typically 0.9–1.2m)
  groundFloorArea: number;      // m² (for raft)
  numberOfColumns?: number;     // for pad foundations
  columnPadSize?: number;       // m (square pad)
}

export interface SlabCalculationInput {
  area: number;                 // m²
  thickness: number;            // m (typically 0.1–0.15m)
  rebarKgPerSqm: number;        // kg/m² (typically 10–25)
  withScreed: boolean;
  screedThickness: number;      // m (typically 0.05m)
}

export interface RoofCalculationInput {
  grossRoofArea: number;        // m² (actual sloped area with overhang)
  roofType: string;
  pitchDegrees: number;
  perimeterForGutter: number;   // m
}
