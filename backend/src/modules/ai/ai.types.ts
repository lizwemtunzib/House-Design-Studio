import { HouseModelSpec, HouseIntentModel } from '../../shared/types/house-model.types';

// ─── AI Layer Types ────────────────────────────────────────────────────────────
// AI is responsible ONLY for:
//   1. Visual design generation (exterior/interior/landscape renders)
//   2. Interpreting user text/image into a structured HouseModelSpec
//   3. Iterative design editing (user prompts edits, AI revises model)
//
// AI is NOT responsible for BOQ calculations or cost estimates.

export interface VisualDesignRequest {
  intent: HouseIntentModel;
  style: string;
  numberOfVariations: number;
  iterationPrompt?: string;      // "make the windows bigger", "add a garage"
  previousRenderUrl?: string;    // for inpainting/variation on existing design
}

export interface VisualDesignResult {
  exteriorRenders: string[];     // URLs (stored in cloud or local)
  interiorConcepts: string[];
  landscapingRender?: string;
  floorPlanSketch?: string;
  designNotes: string;
  styleUsed: string;
}

export interface PlanningAIRequest {
  intent: HouseIntentModel;
  designNotes?: string;          // from visual AI
}

export interface PlanningAIResult {
  houseModel: Omit<HouseModelSpec, 'id' | 'projectId'>;
  confidence: number;            // 0–1
  assumptions: string[];
  suggestedAlternatives?: string[];
  rationale: string;
}

export interface DesignIterationRequest {
  currentModel: HouseModelSpec;
  userPrompt: string;            // "add a swimming pool", "remove the garage"
}

export interface DesignIterationResult {
  updatedModel: Omit<HouseModelSpec, 'id' | 'projectId'>;
  changesApplied: string[];
  warnings: string[];
}
