import { create } from 'zustand';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface HouseIntent {
  textDescription: string;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  floors: number;
  targetArea: number;
  plotSize: number;
  style: string;
  wallSystem: string;
  hasPool: boolean;
  hasGarden: boolean;
  hasDriveway: boolean;
  hasFencing: boolean;
  country: string;
  city: string;
  additionalRequirements: string;
  referenceImage?: File;
}

export interface DesignResult {
  exteriorRenders: string[];
  interiorConcepts: string[];
  landscapingRender?: string;
  designNotes: string;
  status: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
}

export interface StructureModel {
  wallSystem: string;
  roofType: string;
  foundationType: string;
  totalFloorArea: number;
  groundFloorArea: number;
  numberOfFloors: number;
  rooms: Room[];
}

export interface Room {
  id: string;
  name: string;
  width: number;
  length: number;
  area: number;
  xPosition: number;
  yPosition: number;
  floorNumber: number;
}

export interface BOQItem {
  id: string;
  category: string;
  subCategory: string;
  description: string;
  unit: string;
  quantity: number;
  notes?: string;
}

export interface PriceInput {
  boqItemId: string;
  unitPrice: number;
  labourRate: number;
}

interface DesignStore {
  // Navigation
  currentStep: WizardStep;
  projectId: string | null;

  // Step data
  intent: HouseIntent;
  designResult: DesignResult | null;
  structureModel: StructureModel | null;
  boqItems: BOQItem[];
  priceInputs: Record<string, PriceInput>;
  currency: string;

  // Actions
  setStep: (step: WizardStep) => void;
  setProjectId: (id: string) => void;
  setIntent: (intent: Partial<HouseIntent>) => void;
  setDesignResult: (result: DesignResult) => void;
  setStructureModel: (model: StructureModel) => void;
  setBOQItems: (items: BOQItem[]) => void;
  setPriceInput: (itemId: string, unitPrice: number, labourRate?: number) => void;
  setBulkPriceInputs: (inputs: PriceInput[]) => void;
  setCurrency: (currency: string) => void;
  reset: () => void;
}

const defaultIntent: HouseIntent = {
  textDescription: '',
  bedrooms: 3,
  bathrooms: 2,
  garages: 1,
  floors: 1,
  targetArea: 150,
  plotSize: 500,
  style: 'MODERN',
  wallSystem: 'BRICK_MASONRY',
  hasPool: false,
  hasGarden: true,
  hasDriveway: true,
  hasFencing: true,
  country: '',
  city: '',
  additionalRequirements: '',
};

export const useDesignStore = create<DesignStore>()((set) => ({
  currentStep: 1,
  projectId: null,
  intent: defaultIntent,
  designResult: null,
  structureModel: null,
  boqItems: [],
  priceInputs: {},
  currency: 'USD',

  setStep: (step) => set({ currentStep: step }),
  setProjectId: (id) => set({ projectId: id }),
  setIntent: (updates) => set((s) => ({ intent: { ...s.intent, ...updates } })),
  setDesignResult: (result) => set({ designResult: result }),
  setStructureModel: (model) => set({ structureModel: model }),
  setBOQItems: (items) => set({ boqItems: items }),
  setPriceInput: (itemId, unitPrice, labourRate = 0) =>
    set((s) => ({
      priceInputs: {
        ...s.priceInputs,
        [itemId]: { boqItemId: itemId, unitPrice, labourRate },
      },
    })),
  setBulkPriceInputs: (inputs) =>
    set(() => ({
      priceInputs: Object.fromEntries(inputs.map((i) => [i.boqItemId, i])),
    })),
  setCurrency: (currency) => set({ currency }),
  reset: () => set({
    currentStep: 1,
    projectId: null,
    intent: defaultIntent,
    designResult: null,
    structureModel: null,
    boqItems: [],
    priceInputs: {},
  }),
}));
