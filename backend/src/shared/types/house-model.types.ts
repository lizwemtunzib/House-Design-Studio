// ─── Core House Model Types ───────────────────────────────────────────────────
// These are the runtime types used throughout the application.
// Prisma schema is the persistence layer; these types drive the BOQ engine.

export type BuildingSystemType =
  | 'BRICK_MASONRY'
  | 'CONCRETE_BLOCK'
  | 'INTERLOCKING_BLOCK'
  | 'MAKIGA_SOIL_BLOCK'
  | 'TIMBER_FRAME'
  | 'LIGHT_STEEL_FRAME'
  | 'GLASS_CURTAIN_WALL'
  | 'PRECAST_PANEL'
  | 'SIP_PANEL';

export type RoofType = 'HIP' | 'GABLE' | 'FLAT' | 'MONO_PITCH' | 'MANSARD' | 'BUTTERFLY';
export type FloorSystemType = 'CONCRETE_SLAB' | 'TIMBER_JOISTS' | 'STEEL_DECK' | 'PRECAST_HOLLOWCORE';
export type FoundationType = 'STRIP' | 'PAD' | 'RAFT' | 'PILE';
export type DesignStyle =
  | 'MODERN' | 'CONTEMPORARY' | 'LUXURY' | 'MINIMALIST'
  | 'AFRICAN_VERNACULAR' | 'MEDITERRANEAN' | 'TIMBER_HEAVY'
  | 'GLASS_HEAVY' | 'PREFAB_MODULAR';

export interface RoomSpec {
  id: string;
  name: string;
  width: number;    // metres
  length: number;   // metres
  area: number;     // m²
  xPosition: number;
  yPosition: number;
  floorNumber: number;
  doors: number;
  windows: number;
  isExternal: boolean;
}

export interface OpeningSpec {
  type: 'DOOR' | 'WINDOW' | 'GLASS_PANEL' | 'SLIDING_DOOR';
  width: number;  // metres
  height: number; // metres
  quantity: number;
  area: number;   // individual area m²
  totalArea: number;
}

export interface ExternalWorksSpec {
  hasDriveway: boolean;
  drivewaySqm: number;
  drivewayMaterial?: 'CONCRETE' | 'PAVING' | 'GRAVEL' | 'TARMAC';
  hasPool: boolean;
  poolSqm: number;
  hasGarden: boolean;
  gardenSqm: number;
  hasFencing: boolean;
  fencingLinearM: number;
  fencingType?: 'BRICK' | 'BLOCK' | 'TIMBER' | 'STEEL_PALISADE' | 'WIRE_MESH';
  hasRetainingWall: boolean;
  retainingWallLinearM: number;
  hasPathways: boolean;
  pathwaysSqm: number;
}

export interface LandscapingSpec {
  hasLawnTurf: boolean;
  lawnSqm: number;
  hasGardenBeds: boolean;
  gardenBedsSqm: number;
  hasIrrigation: boolean;
  hasStonePaving: boolean;
  stonePavingSqm: number;
  numberOfTrees: number;
  numberOfShrubs: number;
}

export interface HouseModelSpec {
  // Identity
  id: string;
  projectId: string;

  // Overall dimensions
  totalFloorArea: number;       // sum of all floors, m²
  groundFloorArea: number;      // footprint, m²
  numberOfFloors: number;
  floorToFloorHeight: number;   // metres (typical 2.8–3.2)
  perimeterLength: number;      // ground floor external perimeter, m

  // Systems
  wallSystem: BuildingSystemType;
  roofType: RoofType;
  roofPitchDegrees: number;     // 0 for flat, 15–45 for pitched
  floorSystem: FloorSystemType;
  foundationType: FoundationType;

  // Wall dimensions
  externalWallThickness: number;  // metres
  internalWallThickness: number;

  // Rooms
  rooms: RoomSpec[];

  // Openings (aggregated)
  openings: OpeningSpec[];

  // External works
  externalWorks: ExternalWorksSpec;
  landscaping: LandscapingSpec;

  // Derived (calculated from rooms/geometry)
  totalExternalWallArea: number;   // m² (before deducting openings)
  totalInternalWallArea: number;   // m²
  totalOpeningsArea: number;       // m²
  totalDoors: number;
  totalWindows: number;
  totalGlassArea: number;          // m²
  roofArea: number;                // m² (actual sloped area)
}

// ─── User Input Model (what user types / AI interprets) ───────────────────────

export interface HouseIntentModel {
  textDescription?: string;
  uploadedImageUrl?: string;
  templateId?: string;
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
  floors?: number;
  targetArea?: number;          // m²
  plotSize?: number;            // m²
  style?: DesignStyle;
  wallSystem?: BuildingSystemType;
  hasPool?: boolean;
  hasGarden?: boolean;
  hasDriveway?: boolean;
  hasFencing?: boolean;
  budgetRange?: {
    min: number;
    max: number;
    currency: string;
  };
  country?: string;
  city?: string;
  additionalRequirements?: string;
}
