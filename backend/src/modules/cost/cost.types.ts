export interface PriceInputItem {
  boqItemId: string;
  unitPrice: number;         // cost per unit
  labourRate?: number;       // optional labour cost per unit
  currency: string;
}

export interface CostBreakdownCategory {
  category: string;
  materialsCost: number;
  labourCost: number;
  totalCost: number;
  percentage: number;        // % of total project cost
  itemCount: number;
}

export interface CostResult {
  boqId: string;
  currency: string;
  totalMaterials: number;
  totalLabour: number;
  totalCost: number;
  costPerSqm: number;
  floorArea: number;
  breakdown: CostBreakdownCategory[];
  lineItems: CostLineItem[];
  summary: {
    mostExpensiveCategory: string;
    labourToMaterialRatio: number;
    estimateConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
    notes: string[];
  };
}

export interface CostLineItem {
  boqItemId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  labourRate: number;
  materialsCost: number;
  labourCost: number;
  totalCost: number;
  category: string;
}
