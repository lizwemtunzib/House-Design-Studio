import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import {
  PlanningAIRequest, PlanningAIResult,
  DesignIterationRequest, DesignIterationResult,
} from './ai.types';
import { HouseModelSpec, HouseIntentModel } from '../../shared/types/house-model.types';

// ─── Planning AI Service (Claude) ─────────────────────────────────────────────
// Responsibility: Convert user intent → structured HouseModelSpec JSON.
// Output MUST be valid JSON that the BOQ engine can consume.
// Never calculates BOQ quantities. Never estimates costs.

const SYSTEM_PROMPT = `You are a structural building planner AI assistant for House Design Studio.

Your ONLY job is to convert a user's house description into a structured JSON building model.

STRICT RULES:
1. Output ONLY valid JSON. No prose, no markdown fences, no explanation.
2. Never calculate BOQ quantities. Never estimate costs. That is done by a separate deterministic engine.
3. All dimensions must be in METRES.
4. Be realistic about typical residential construction dimensions.
5. If information is missing, use sensible residential defaults and note them in assumptions[].

OUTPUT FORMAT (strict JSON schema):
{
  "totalFloorArea": number,      // sum of all floors in m²
  "groundFloorArea": number,     // footprint in m²
  "numberOfFloors": number,      // 1 or 2 for residential
  "floorToFloorHeight": number,  // typically 2.8–3.2
  "perimeterLength": number,     // ground floor external perimeter in m
  "wallSystem": "BRICK_MASONRY"|"CONCRETE_BLOCK"|"INTERLOCKING_BLOCK"|"MAKIGA_SOIL_BLOCK"|"TIMBER_FRAME"|"LIGHT_STEEL_FRAME"|"GLASS_CURTAIN_WALL"|"PRECAST_PANEL"|"SIP_PANEL",
  "roofType": "HIP"|"GABLE"|"FLAT"|"MONO_PITCH"|"MANSARD"|"BUTTERFLY",
  "roofPitchDegrees": number,
  "floorSystem": "CONCRETE_SLAB"|"TIMBER_JOISTS"|"STEEL_DECK"|"PRECAST_HOLLOWCORE",
  "foundationType": "STRIP"|"PAD"|"RAFT"|"PILE",
  "externalWallThickness": number,  // e.g. 0.23 for brick, 0.20 for block
  "internalWallThickness": number,  // e.g. 0.11 for half-brick
  "rooms": [
    {
      "id": "uuid-style-string",
      "name": string,
      "width": number,
      "length": number,
      "area": number,
      "xPosition": number,
      "yPosition": number,
      "floorNumber": number,
      "doors": number,
      "windows": number,
      "isExternal": boolean
    }
  ],
  "openings": [
    {
      "type": "DOOR"|"WINDOW"|"GLASS_PANEL"|"SLIDING_DOOR",
      "width": number,
      "height": number,
      "quantity": number,
      "area": number,
      "totalArea": number
    }
  ],
  "externalWorks": {
    "hasDriveway": boolean,
    "drivewaySqm": number,
    "drivewayMaterial": "CONCRETE"|"PAVING"|"GRAVEL"|"TARMAC",
    "hasPool": boolean,
    "poolSqm": number,
    "hasGarden": boolean,
    "gardenSqm": number,
    "hasFencing": boolean,
    "fencingLinearM": number,
    "fencingType": "BRICK"|"BLOCK"|"TIMBER"|"STEEL_PALISADE"|"WIRE_MESH",
    "hasRetainingWall": boolean,
    "retainingWallLinearM": number,
    "hasPathways": boolean,
    "pathwaysSqm": number
  },
  "landscaping": {
    "hasLawnTurf": boolean,
    "lawnSqm": number,
    "hasGardenBeds": boolean,
    "gardenBedsSqm": number,
    "hasIrrigation": boolean,
    "hasStonePaving": boolean,
    "stonePavingSqm": number,
    "numberOfTrees": number,
    "numberOfShrubs": number
  },
  "totalExternalWallArea": number,
  "totalInternalWallArea": number,
  "totalOpeningsArea": number,
  "totalDoors": number,
  "totalWindows": number,
  "totalGlassArea": number,
  "roofArea": number,
  "confidence": number,
  "assumptions": string[],
  "rationale": string
}`;

export class PlanningAIService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }

  async generateModel(request: PlanningAIRequest): Promise<PlanningAIResult> {
    const userMessage = this.buildUserMessage(request.intent, request.designNotes);

    const response = await this.client.messages.create({
      model: config.anthropic.planningModel,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');

    const parsed = this.parseModelResponse(rawText, request.intent);
    return parsed;
  }

  async iterateModel(request: DesignIterationRequest): Promise<DesignIterationResult> {
    const currentModelJson = JSON.stringify(request.currentModel, null, 2);

    const response = await this.client.messages.create({
      model: config.anthropic.planningModel,
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}

ITERATION MODE: You are given an existing house model JSON and a user edit request.
Apply the requested change to the model and return the full updated model JSON.
Also include "changesApplied": string[] and "warnings": string[] fields.`,
      messages: [
        {
          role: 'user',
          content: `CURRENT MODEL:\n${currentModelJson}\n\nUSER REQUEST: ${request.userPrompt}\n\nReturn the complete updated model JSON.`,
        },
      ],
    });

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');

    const json = this.extractJson(rawText);
    return {
      updatedModel: json,
      changesApplied: json.changesApplied ?? ['Model updated per user request'],
      warnings: json.warnings ?? [],
    };
  }

  private buildUserMessage(intent: HouseIntentModel, designNotes?: string): string {
    const parts: string[] = [];

    if (intent.textDescription) parts.push(`Description: ${intent.textDescription}`);
    if (intent.bedrooms) parts.push(`Bedrooms: ${intent.bedrooms}`);
    if (intent.bathrooms) parts.push(`Bathrooms: ${intent.bathrooms}`);
    if (intent.garages) parts.push(`Garages: ${intent.garages}`);
    if (intent.floors) parts.push(`Floors: ${intent.floors}`);
    if (intent.targetArea) parts.push(`Target floor area: ${intent.targetArea} m²`);
    if (intent.plotSize) parts.push(`Plot size: ${intent.plotSize} m²`);
    if (intent.style) parts.push(`Architectural style: ${intent.style}`);
    if (intent.wallSystem) parts.push(`Preferred wall system: ${intent.wallSystem}`);
    if (intent.hasPool) parts.push('Include: swimming pool');
    if (intent.hasDriveway) parts.push('Include: driveway');
    if (intent.hasFencing) parts.push('Include: perimeter fencing');
    if (intent.country) parts.push(`Country: ${intent.country}`);
    if (intent.city) parts.push(`City: ${intent.city}`);
    if (designNotes) parts.push(`Design notes from visual AI: ${designNotes}`);
    if (intent.additionalRequirements) parts.push(`Additional: ${intent.additionalRequirements}`);

    return `Generate a house model JSON for:\n\n${parts.join('\n')}\n\nReturn ONLY the JSON object.`;
  }

  private parseModelResponse(raw: string, intent: HouseIntentModel): PlanningAIResult {
    const json = this.extractJson(raw);

    // Derive derived fields if missing
    if (!json.totalExternalWallArea) {
      json.totalExternalWallArea = json.perimeterLength * json.floorToFloorHeight * json.numberOfFloors;
    }
    if (!json.totalInternalWallArea) {
      json.totalInternalWallArea = json.totalExternalWallArea * 0.65;
    }
    if (!json.roofArea) {
      const pitchFactor = json.roofType === 'FLAT' ? 1 : 1 / Math.cos((json.roofPitchDegrees ?? 25) * Math.PI / 180);
      json.roofArea = json.groundFloorArea * pitchFactor * 1.1;
    }

    // Sum openings
    let totalDoors = 0, totalWindows = 0, totalGlassArea = 0, totalOpeningsArea = 0;
    for (const o of json.openings ?? []) {
      if (o.type === 'DOOR' || o.type === 'SLIDING_DOOR') totalDoors += o.quantity;
      else totalWindows += o.quantity;
      totalGlassArea += o.totalArea ?? o.area * o.quantity;
      totalOpeningsArea += o.totalArea ?? o.area * o.quantity;
    }
    json.totalDoors = totalDoors;
    json.totalWindows = totalWindows;
    json.totalGlassArea = totalGlassArea;
    json.totalOpeningsArea = totalOpeningsArea;

    return {
      houseModel: json as Omit<HouseModelSpec, 'id' | 'projectId'>,
      confidence: json.confidence ?? 0.8,
      assumptions: json.assumptions ?? [],
      rationale: json.rationale ?? '',
    };
  }

  private extractJson(text: string): any {
    // Strip markdown fences if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // Find JSON object in text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Planning AI returned invalid JSON');
    }
  }
}

export const planningAI = new PlanningAIService();
