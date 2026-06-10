import { v4 as uuid } from 'uuid';
import { HouseModelSpec } from '../../shared/types/house-model.types';
import {
  BOQLineItem, BOQResult, BOQCategory,
  WallCalculationInput, FoundationCalculationInput,
  SlabCalculationInput, RoofCalculationInput,
} from './boq.types';
import { brickWallBOQ } from './systems/brick.system';
import { blockWallBOQ } from './systems/block.system';
import { timberFrameWallBOQ } from './systems/timber.system';
import { steelFrameWallBOQ } from './systems/steel.system';
import { glassCurtainWallBOQ } from './systems/glass.system';
import { makigaWallBOQ } from './systems/makiga.system';
import { sipPanelBOQ } from './systems/sip.system';
import { precastPanelBOQ } from './systems/precast.system';
import { interlockingBlockBOQ } from './systems/interlocking.system';

// ─── BOQ Engine ───────────────────────────────────────────────────────────────
// DETERMINISTIC — no AI, no randomness. Given the same HouseModelSpec,
// always produces the same BOQ. This is the source of truth for quantities.

export class BOQEngine {
  private items: BOQLineItem[] = [];
  private warnings: string[] = [];
  private assumptions: string[] = [];
  private sortCounter = 0;

  calculate(model: HouseModelSpec): BOQResult {
    this.items = [];
    this.warnings = [];
    this.assumptions = [];
    this.sortCounter = 0;

    // Run all calculation sections in order
    this.calcPreliminary(model);
    this.calcExcavation(model);
    this.calcFoundation(model);
    this.calcGroundFloorSlab(model);
    this.calcWalls(model);
    this.calcColumnsAndBeams(model);
    this.calcUpperFloorSlabs(model);
    this.calcRoofStructure(model);
    this.calcRoofCovering(model);
    this.calcWindowsAndDoors(model);
    this.calcInternalFinishes(model);
    this.calcExternalFinishes(model);
    this.calcExternalWorks(model);
    this.calcLandscaping(model);

    const byCategory = this.buildCategorySummary();

    return {
      modelId: model.id,
      version: 1,
      wallSystemUsed: model.wallSystem,
      items: this.items,
      summary: {
        totalItems: this.items.length,
        byCategory,
      },
      warnings: this.warnings,
      assumptions: this.assumptions,
    };
  }

  // ── 1. Preliminaries ───────────────────────────────────────────────────────
  private calcPreliminary(model: HouseModelSpec) {
    this.add({
      category: 'PRELIMINARY',
      subCategory: 'SITE_CLEARANCE',
      description: 'Site clearance, topsoil strip (150mm) and disposal off site',
      unit: 'm²',
      quantity: parseFloat((model.groundFloorArea * 1.3).toFixed(1)),
      notes: 'Includes 15% margin for working space',
    });

    this.add({
      category: 'PRELIMINARY',
      subCategory: 'SITE_SETUP',
      description: 'Temporary site hoarding, site office and welfare facilities',
      unit: 'lump',
      quantity: 1,
    });

    this.add({
      category: 'PRELIMINARY',
      subCategory: 'SITE_SETUP',
      description: 'Setting out — establishment of grid lines, bench marks and corner pegs',
      unit: 'lump',
      quantity: 1,
    });

    this.assumptions.push('Site is on level ground. Sloping sites require re-assessment of excavation quantities.');
    this.assumptions.push('Standard residential construction assumed. Specialist contractor quotes required for curtain wall, glass, and precast systems.');
  }

  // ── 2. Excavation ──────────────────────────────────────────────────────────
  private calcExcavation(model: HouseModelSpec) {
    const foundationDepth = model.foundationType === 'RAFT' ? 0.3 : 1.0;
    const foundationWidth = 0.5;
    const topsoilDepth = 0.15;

    if (model.foundationType === 'RAFT') {
      // Bulk excavation for raft
      const excavVol = parseFloat(((model.groundFloorArea * 1.1) * (foundationDepth + topsoilDepth)).toFixed(2));
      this.add({
        category: 'EXCAVATION',
        subCategory: 'BULK_EXCAVATION',
        description: 'Bulk excavation for raft foundation — by machine, dispose off site',
        unit: 'm³',
        quantity: excavVol,
      });
    } else {
      // Strip or pad excavation
      const stripVol = parseFloat((model.perimeterLength * foundationWidth * (foundationDepth + topsoilDepth)).toFixed(2));
      this.add({
        category: 'EXCAVATION',
        subCategory: 'STRIP_EXCAVATION',
        description: `Strip foundation excavation — ${foundationWidth}m wide × ${(foundationDepth + topsoilDepth).toFixed(1)}m deep`,
        unit: 'm³',
        quantity: stripVol,
        notes: `Perimeter: ${model.perimeterLength.toFixed(1)} m`,
      });
    }

    // Surface water drainage cut-off trench
    this.add({
      category: 'EXCAVATION',
      subCategory: 'DRAINAGE',
      description: 'Cut-off trench and surface water drain around building perimeter',
      unit: 'm',
      quantity: Math.ceil(model.perimeterLength * 1.1),
    });

    this.assumptions.push(`Foundation depth assumed: ${foundationDepth}m below topsoil. Structural engineer to confirm from soil report.`);
  }

  // ── 3. Foundation ──────────────────────────────────────────────────────────
  private calcFoundation(model: HouseModelSpec) {
    const foundationWidth = 0.5;
    const foundationDepth = model.foundationType === 'RAFT' ? 0.25 : 0.35; // concrete depth
    const wasteFactor = 1.05;

    if (model.foundationType === 'RAFT') {
      const concreteM3 = parseFloat((model.groundFloorArea * foundationDepth * wasteFactor).toFixed(2));
      const rebarKg = Math.ceil(model.groundFloorArea * 25); // 25 kg/m² for raft

      this.add({ category: 'SUBSTRUCTURE', subCategory: 'RAFT_FOUNDATION', description: 'Blinding concrete (50mm) — lean mix C10 under raft', unit: 'm³', quantity: parseFloat((model.groundFloorArea * 0.05).toFixed(2)) });
      this.add({ category: 'SUBSTRUCTURE', subCategory: 'RAFT_FOUNDATION', description: 'DPM (Damp Proof Membrane) 1200 gauge polythene to full raft area', unit: 'm²', quantity: Math.ceil(model.groundFloorArea * 1.1) });
      this.add({ category: 'SUBSTRUCTURE', subCategory: 'RAFT_FOUNDATION', description: `Raft foundation concrete C25/30 — ${(foundationDepth * 1000).toFixed(0)}mm thick`, unit: 'm³', quantity: concreteM3 });
      this.add({ category: 'SUBSTRUCTURE', subCategory: 'RAFT_FOUNDATION', description: 'Raft reinforcement — top and bottom mesh + edge thickening bars', unit: 'kg', quantity: rebarKg });

    } else if (model.foundationType === 'STRIP') {
      const stripConcreteM3 = parseFloat((model.perimeterLength * foundationWidth * foundationDepth * wasteFactor).toFixed(2));
      const rebarKg = Math.ceil(model.perimeterLength * 8); // ~8 kg/m for strip

      this.add({ category: 'SUBSTRUCTURE', subCategory: 'STRIP_FOUNDATION', description: 'Blinding concrete (50mm lean mix C10) to bottom of strip footing', unit: 'm³', quantity: parseFloat((model.perimeterLength * foundationWidth * 0.05).toFixed(2)) });
      this.add({ category: 'SUBSTRUCTURE', subCategory: 'STRIP_FOUNDATION', description: `Strip foundation concrete C25/30 — ${foundationWidth * 1000}mm wide × ${(foundationDepth * 1000).toFixed(0)}mm deep`, unit: 'm³', quantity: stripConcreteM3 });
      this.add({ category: 'SUBSTRUCTURE', subCategory: 'STRIP_FOUNDATION', description: 'Strip foundation reinforcement — 3 × Y12 longitudinal bars + Y8 links @ 300mm', unit: 'kg', quantity: rebarKg });

      // Foundation walling (from strip to DPC)
      const foundWallHeight = 0.45; // typically 3 courses above strip to DPC
      const foundWallVol = parseFloat((model.perimeterLength * foundationWidth * foundWallHeight).toFixed(2));
      this.add({ category: 'SUBSTRUCTURE', subCategory: 'FOUNDATION_WALLING', description: 'Foundation walling (solid concrete fill or blockwork) from strip to DPC level', unit: 'm³', quantity: foundWallVol });
    }

    this.add({ category: 'SUBSTRUCTURE', subCategory: 'BACKFILL', description: 'Backfill and compact excavated material around foundation', unit: 'm³', quantity: parseFloat((model.perimeterLength * 0.4 * 0.5).toFixed(2)) });
    this.add({ category: 'SUBSTRUCTURE', subCategory: 'HARDCORE', description: 'Compacted hardcore (300mm) under ground floor slab', unit: 'm³', quantity: parseFloat((model.groundFloorArea * 0.3).toFixed(2)) });
  }

  // ── 4. Ground Floor Slab ───────────────────────────────────────────────────
  private calcGroundFloorSlab(model: HouseModelSpec) {
    const input: SlabCalculationInput = {
      area: model.groundFloorArea,
      thickness: 0.125,
      rebarKgPerSqm: 12,
      withScreed: true,
      screedThickness: 0.05,
    };
    this.calcSlab(input, 'SUBSTRUCTURE', 'GROUND_FLOOR_SLAB', 'Ground floor');
  }

  // ── Generic slab calculator ────────────────────────────────────────────────
  private calcSlab(
    input: SlabCalculationInput,
    category: BOQCategory,
    subCategory: string,
    label: string,
  ) {
    const wf = 1.05;
    const concreteM3 = parseFloat((input.area * input.thickness * wf).toFixed(2));
    const rebarKg = Math.ceil(input.area * input.rebarKgPerSqm * wf);

    this.add({ category, subCategory, description: `${label} slab — DPM 1200 gauge polythene sheet`, unit: 'm²', quantity: Math.ceil(input.area * 1.1) });
    this.add({ category, subCategory, description: `${label} slab — concrete C25/30, ${(input.thickness * 1000).toFixed(0)}mm thick`, unit: 'm³', quantity: concreteM3 });
    this.add({ category, subCategory, description: `${label} slab — BRC A142 mesh reinforcement`, unit: 'kg', quantity: rebarKg });

    if (input.withScreed) {
      const screedM3 = parseFloat((input.area * input.screedThickness * 1.03).toFixed(2));
      this.add({ category, subCategory, description: `${label} — cement:sand screed 1:3, ${(input.screedThickness * 1000).toFixed(0)}mm thick`, unit: 'm³', quantity: screedM3 });
    }
  }

  // ── 5. Walls ───────────────────────────────────────────────────────────────
  private calcWalls(model: HouseModelSpec) {
    const WASTE = 0.05;

    const extInput: WallCalculationInput = {
      netWallArea: model.totalExternalWallArea - model.totalOpeningsArea,
      grossWallArea: model.totalExternalWallArea,
      wallThickness: model.externalWallThickness,
      isExternal: true,
      wasteFactor: WASTE,
    };

    const intInput: WallCalculationInput = {
      netWallArea: model.totalInternalWallArea * 0.8,
      grossWallArea: model.totalInternalWallArea,
      wallThickness: model.internalWallThickness,
      isExternal: false,
      wasteFactor: WASTE,
    };

    let extItems: BOQLineItem[] = [];
    let intItems: BOQLineItem[] = [];

    switch (model.wallSystem) {
      case 'BRICK_MASONRY':
        extItems = brickWallBOQ(extInput, this.sortCounter);
        intItems = brickWallBOQ(intInput, this.sortCounter + 100);
        break;
      case 'CONCRETE_BLOCK':
        extItems = blockWallBOQ(extInput, this.sortCounter);
        intItems = blockWallBOQ(intInput, this.sortCounter + 100);
        break;
      case 'INTERLOCKING_BLOCK':
        extItems = interlockingBlockBOQ(extInput, this.sortCounter);
        intItems = interlockingBlockBOQ(intInput, this.sortCounter + 100);
        break;
      case 'MAKIGA_SOIL_BLOCK':
        extItems = makigaWallBOQ(extInput, this.sortCounter);
        intItems = makigaWallBOQ(intInput, this.sortCounter + 100);
        break;
      case 'TIMBER_FRAME':
        extItems = timberFrameWallBOQ(extInput, this.sortCounter);
        intItems = timberFrameWallBOQ(intInput, this.sortCounter + 100);
        break;
      case 'LIGHT_STEEL_FRAME':
        extItems = steelFrameWallBOQ(extInput, this.sortCounter);
        intItems = steelFrameWallBOQ(intInput, this.sortCounter + 100);
        break;
      case 'GLASS_CURTAIN_WALL':
        extItems = glassCurtainWallBOQ(extInput, this.sortCounter);
        this.warnings.push('Glass curtain wall requires specialist façade contractor and structural engineer sign-off.');
        break;
      case 'SIP_PANEL':
        extItems = sipPanelBOQ(extInput, this.sortCounter);
        intItems = sipPanelBOQ(intInput, this.sortCounter + 100);
        break;
      case 'PRECAST_PANEL':
        extItems = precastPanelBOQ(extInput, this.sortCounter);
        this.warnings.push('Precast panels require specialist erection contractor and mobile crane.');
        break;
    }

    this.items.push(...extItems, ...intItems);
    this.sortCounter += 200;
  }

  // ── 6. Columns and Beams (RC frame if applicable) ─────────────────────────
  private calcColumnsAndBeams(model: HouseModelSpec) {
    if (model.numberOfFloors <= 1) return;

    const colSpacing = 4.5; // m
    const numberOfCols = Math.ceil((model.perimeterLength / colSpacing) + 4);
    const colHeight = model.floorToFloorHeight * model.numberOfFloors;
    const colSection = 0.3; // 300mm square column

    const colConcreteM3 = parseFloat((numberOfCols * colSection * colSection * colHeight).toFixed(2));
    const colRebarKg = Math.ceil(numberOfCols * colHeight * 18); // ~18 kg/m for column

    const beamLinM = Math.ceil(model.perimeterLength * 1.3); // perimeter + internal beams
    const beamConcreteM3 = parseFloat((beamLinM * 0.3 * 0.45).toFixed(2)); // 300×450 beam
    const beamRebarKg = Math.ceil(beamLinM * 22); // ~22 kg/m for beam

    this.add({ category: 'SUPERSTRUCTURE', subCategory: 'RC_COLUMNS', description: `RC columns (${(colSection * 1000).toFixed(0)}×${(colSection * 1000).toFixed(0)}mm) — C30/37 concrete`, unit: 'm³', quantity: colConcreteM3 });
    this.add({ category: 'SUPERSTRUCTURE', subCategory: 'RC_COLUMNS', description: `Column reinforcement — 4 × Y16 main bars + Y8 links @ 150mm`, unit: 'kg', quantity: colRebarKg });
    this.add({ category: 'SUPERSTRUCTURE', subCategory: 'RC_BEAMS', description: `RC beams (300×450mm) at upper floor level — C30/37 concrete`, unit: 'm³', quantity: beamConcreteM3 });
    this.add({ category: 'SUPERSTRUCTURE', subCategory: 'RC_BEAMS', description: `Beam reinforcement — 4 × Y16 main bars + Y8 links @ 150mm`, unit: 'kg', quantity: beamRebarKg });
    this.add({ category: 'SUPERSTRUCTURE', subCategory: 'FORMWORK', description: `Formwork (shuttering) to columns and beams`, unit: 'm²', quantity: Math.ceil(beamLinM * 1.2 * 2 + numberOfCols * colHeight * 4) });
    this.warnings.push('Column and beam layout requires structural engineer calculation. Quantities above are preliminary estimates.');
  }

  // ── 7. Upper Floor Slabs ───────────────────────────────────────────────────
  private calcUpperFloorSlabs(model: HouseModelSpec) {
    if (model.numberOfFloors <= 1) return;
    const upperFloorArea = model.totalFloorArea - model.groundFloorArea;
    this.calcSlab({ area: upperFloorArea, thickness: 0.15, rebarKgPerSqm: 20, withScreed: true, screedThickness: 0.05 }, 'SUPERSTRUCTURE', 'UPPER_FLOOR_SLAB', 'Upper floor');
  }

  // ── 8. Roof Structure ──────────────────────────────────────────────────────
  private calcRoofStructure(model: HouseModelSpec) {
    const pitchFactor = model.roofType === 'FLAT' ? 1.0 : 1 / Math.cos(model.roofPitchDegrees * Math.PI / 180);
    const roofArea = model.groundFloorArea * pitchFactor * 1.1; // 10% overhang/hips

    if (model.roofType === 'FLAT') {
      // Flat roof: concrete or timber flat deck
      this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: 'Flat roof slab — RC concrete C25/30, 125mm thick with falls', unit: 'm³', quantity: parseFloat((roofArea * 0.125).toFixed(2)) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: 'Flat roof reinforcement — BRC A193 mesh', unit: 'kg', quantity: Math.ceil(roofArea * 15) });
    } else {
      // Pitched roof: timber or steel truss
      const trussSpacing = 0.6; // 600mm c/c
      const numberOfTrusses = Math.ceil((model.groundFloorArea / trussSpacing) / model.perimeterLength * 20);
      const ridgeLinM = Math.ceil(model.groundFloorArea / model.perimeterLength * 4); // rough ridge length

      this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: `Prefabricated timber roof trusses @ ${trussSpacing * 1000}mm c/c (supply and erect)`, unit: 'nr', quantity: numberOfTrusses });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: 'Ridge board 225×38mm timber', unit: 'm', quantity: ridgeLinM });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: 'Rafter binders and bracing to trusses', unit: 'm', quantity: Math.ceil(roofArea * 0.5) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: 'Fascia board 225×25mm painted timber', unit: 'm', quantity: Math.ceil(model.perimeterLength * 1.05) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: 'Soffit board 150×12mm timber to eaves', unit: 'm²', quantity: Math.ceil(model.perimeterLength * 0.45) });
    }

    this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: 'Wall plate 100×75mm treated timber anchored to ring beam', unit: 'm', quantity: Math.ceil(model.perimeterLength * 1.1) });
    this.add({ category: 'ROOFING', subCategory: 'ROOF_STRUCTURE', description: 'Galvanised mild steel straps (truss anchors) to wall plate', unit: 'nr', quantity: Math.ceil(model.perimeterLength / 0.6) });
  }

  // ── 9. Roof Covering ───────────────────────────────────────────────────────
  private calcRoofCovering(model: HouseModelSpec) {
    const pitchFactor = model.roofType === 'FLAT' ? 1.0 : 1 / Math.cos(model.roofPitchDegrees * Math.PI / 180);
    const roofArea = model.groundFloorArea * pitchFactor * 1.1;

    if (model.roofType === 'FLAT') {
      // Waterproofing system for flat roof
      this.add({ category: 'ROOFING', subCategory: 'ROOF_COVERING', description: '3-layer bituminous felt/APP membrane waterproofing system to flat roof', unit: 'm²', quantity: Math.ceil(roofArea * 1.05) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_COVERING', description: '50mm EPS insulation board under waterproofing', unit: 'm²', quantity: Math.ceil(roofArea * 1.05) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_COVERING', description: 'Pea gravel ballast (50mm) to flat roof (or concrete paving tiles)', unit: 'm²', quantity: Math.ceil(roofArea) });
    } else {
      // Pitched roof: concrete tiles or metal sheets
      this.add({ category: 'ROOFING', subCategory: 'ROOF_COVERING', description: 'Concrete roof tiles (450×330mm) including clips and mortar bed at ridge', unit: 'm²', quantity: Math.ceil(roofArea * 1.05) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_COVERING', description: 'Tiling battens 38×25mm timber at 345mm gauge', unit: 'm', quantity: Math.ceil(roofArea / 0.345) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_COVERING', description: 'Roofing underlay (breathable sarking felt) under tiling battens', unit: 'm²', quantity: Math.ceil(roofArea * 1.1) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_COVERING', description: 'Half-round ridge tiles, mortar-bedded at ridge', unit: 'm', quantity: Math.ceil(model.groundFloorArea / model.perimeterLength * 4) });
      this.add({ category: 'ROOFING', subCategory: 'ROOF_COVERING', description: 'Hip tiles and hip irons (if hip roof)', unit: 'm', quantity: Math.ceil(model.perimeterLength * 0.4) });
    }

    // Gutters and downpipes
    this.add({ category: 'ROOFING', subCategory: 'DRAINAGE', description: 'Half-round PVC gutter 100mm — to all eaves', unit: 'm', quantity: Math.ceil(model.perimeterLength * 1.05) });
    this.add({ category: 'ROOFING', subCategory: 'DRAINAGE', description: 'PVC downpipes 68mm — one per corner plus intermediate', unit: 'm', quantity: Math.ceil(model.perimeterLength / 8) * model.floorToFloorHeight * model.numberOfFloors });
    this.add({ category: 'ROOFING', subCategory: 'DRAINAGE', description: 'Gutter brackets, stop ends, outlets and connectors', unit: 'set', quantity: Math.ceil(model.perimeterLength / 8) });
  }

  // ── 10. Windows and Doors ──────────────────────────────────────────────────
  private calcWindowsAndDoors(model: HouseModelSpec) {
    model.openings.forEach((opening) => {
      this.add({
        category: 'WINDOWS_DOORS',
        subCategory: opening.type === 'DOOR' || opening.type === 'SLIDING_DOOR' ? 'DOORS' : 'WINDOWS',
        description: `${opening.type === 'DOOR' ? 'Timber/aluminium door' : opening.type === 'SLIDING_DOOR' ? 'Aluminium sliding door' : opening.type === 'GLASS_PANEL' ? 'Fixed glass panel' : 'Aluminium window'} — ${(opening.width * 1000).toFixed(0)}×${(opening.height * 1000).toFixed(0)}mm${opening.quantity > 1 ? ` (×${opening.quantity})` : ''}`,
        unit: 'nr',
        quantity: opening.quantity,
        notes: `Individual opening area: ${opening.area.toFixed(2)} m²`,
      });
    });

    if (model.totalGlassArea > 0 && model.wallSystem !== 'GLASS_CURTAIN_WALL') {
      this.add({ category: 'WINDOWS_DOORS', subCategory: 'GLAZING', description: 'Double glazed units (DGU) to windows and doors — 4/12/4 clear', unit: 'm²', quantity: parseFloat(model.totalGlassArea.toFixed(2)) });
    }

    this.add({ category: 'WINDOWS_DOORS', subCategory: 'HARDWARE', description: 'Door and window hardware (hinges, locks, handles, closers) — allow per unit', unit: 'set', quantity: model.totalDoors + model.totalWindows });
    this.add({ category: 'WINDOWS_DOORS', subCategory: 'LINTELS', description: 'Precast concrete lintels over all openings — 150×75mm', unit: 'm', quantity: Math.ceil((model.totalDoors + model.totalWindows) * 1.2) });
    this.add({ category: 'WINDOWS_DOORS', subCategory: 'FRAMES', description: 'Proprietary window and door frame sealant and mastic to perimeters', unit: 'm', quantity: Math.ceil(model.totalOpeningsArea * 4) });
  }

  // ── 11. Internal Finishes ──────────────────────────────────────────────────
  private calcInternalFinishes(model: HouseModelSpec) {
    const totalWallArea = model.totalExternalWallArea + model.totalInternalWallArea;
    const plasterArea = totalWallArea - model.totalOpeningsArea;

    this.add({ category: 'INTERNAL_FINISHES', subCategory: 'PLASTER', description: 'Internal plaster — sand cement 1:4 mix, 12mm thick, smooth finish', unit: 'm²', quantity: Math.ceil(plasterArea * 1.05) });
    this.add({ category: 'INTERNAL_FINISHES', subCategory: 'PLASTER', description: 'Gypsum skim coat over sand cement plaster — 3mm', unit: 'm²', quantity: Math.ceil(plasterArea * 1.05) });
    this.add({ category: 'INTERNAL_FINISHES', subCategory: 'PAINT', description: 'Interior emulsion paint — primer + 2 finish coats to walls and ceilings', unit: 'm²', quantity: Math.ceil((plasterArea + model.totalFloorArea) * 1.05) });

    // Ceiling
    this.add({ category: 'INTERNAL_FINISHES', subCategory: 'CEILING', description: 'Suspended gypsum plasterboard ceiling (12.5mm) on galvanised steel grid', unit: 'm²', quantity: Math.ceil(model.totalFloorArea * 1.05) });

    // Floor finishes
    this.add({ category: 'INTERNAL_FINISHES', subCategory: 'FLOOR_TILING', description: 'Ceramic floor tiles 600×600mm — bedded in cement mortar with grout joints', unit: 'm²', quantity: Math.ceil(model.totalFloorArea * 1.07) });
    this.add({ category: 'INTERNAL_FINISHES', subCategory: 'FLOOR_TILING', description: 'Tile adhesive and grout for floor tiles', unit: 'm²', quantity: Math.ceil(model.totalFloorArea * 1.05) });

    // Skirting
    const skirtingLinM = Math.ceil(model.rooms.reduce((sum, r) => sum + (r.width + r.length) * 2, 0) * 0.9);
    this.add({ category: 'INTERNAL_FINISHES', subCategory: 'SKIRTINGS', description: 'Ceramic skirting tiles 100mm height or timber skirting board', unit: 'm', quantity: skirtingLinM });

    // Wall tiling (wet areas: kitchen + bathrooms estimate)
    const wetAreaFactor = 0.25;
    this.add({ category: 'INTERNAL_FINISHES', subCategory: 'WALL_TILING', description: 'Wall tiles 300×600mm to wet areas (kitchen splash, bathrooms) — bedded in adhesive', unit: 'm²', quantity: Math.ceil(model.totalFloorArea * wetAreaFactor * 3) });
  }

  // ── 12. External Finishes ──────────────────────────────────────────────────
  private calcExternalFinishes(model: HouseModelSpec) {
    const extWallArea = model.totalExternalWallArea;

    if (!['TIMBER_FRAME', 'LIGHT_STEEL_FRAME', 'SIP_PANEL', 'GLASS_CURTAIN_WALL', 'PRECAST_PANEL'].includes(model.wallSystem)) {
      this.add({ category: 'EXTERNAL_FINISHES', subCategory: 'RENDER', description: 'External sand cement render 1:4 mix, 15mm thick — two coats', unit: 'm²', quantity: Math.ceil(extWallArea * 1.05) });
      this.add({ category: 'EXTERNAL_FINISHES', subCategory: 'PAINT', description: 'Exterior masonry paint — alkali-resistant primer + 2 weatherproof finish coats', unit: 'm²', quantity: Math.ceil(extWallArea) });
    }

    this.add({ category: 'EXTERNAL_FINISHES', subCategory: 'COPINGS', description: 'Precast concrete coping to parapet walls (if any)', unit: 'm', quantity: Math.ceil(model.perimeterLength * 0.3) });
    this.add({ category: 'EXTERNAL_FINISHES', subCategory: 'WATERPROOFING', description: 'External waterproofing membrane to below-DPC walling', unit: 'm²', quantity: Math.ceil(model.perimeterLength * 0.5) });
  }

  // ── 13. External Works ─────────────────────────────────────────────────────
  private calcExternalWorks(model: HouseModelSpec) {
    const ew = model.externalWorks;

    if (ew.hasDriveway && ew.drivewaySqm > 0) {
      this.add({ category: 'EXTERNAL_WORKS', subCategory: 'DRIVEWAY', description: 'Driveway — sub-base 150mm compacted hardcore', unit: 'm³', quantity: parseFloat((ew.drivewaySqm * 0.15).toFixed(2)) });
      this.add({ category: 'EXTERNAL_WORKS', subCategory: 'DRIVEWAY', description: 'Driveway surface — interlocking paving bricks or 75mm concrete slab', unit: 'm²', quantity: Math.ceil(ew.drivewaySqm * 1.05) });
    }

    if (ew.hasFencing && ew.fencingLinearM > 0) {
      const fenceType = ew.fencingType || 'BLOCK';
      this.add({ category: 'EXTERNAL_WORKS', subCategory: 'FENCING', description: `Perimeter ${fenceType.toLowerCase()} wall/fence — including foundation, posts and gate openings`, unit: 'm', quantity: Math.ceil(ew.fencingLinearM) });
      this.add({ category: 'EXTERNAL_WORKS', subCategory: 'FENCING', description: 'Gates (vehicle + pedestrian) — mild steel, galvanised and painted', unit: 'set', quantity: 1 });
    }

    if (ew.hasPool && ew.poolSqm > 0) {
      this.add({ category: 'EXTERNAL_WORKS', subCategory: 'POOL', description: 'Swimming pool — RC concrete shell, waterproofing, tiling, filtration system (specialist quote)', unit: 'lump', quantity: 1, notes: `Pool area: ${ew.poolSqm.toFixed(1)} m². Requires specialist contractor.` });
      this.warnings.push('Swimming pool requires specialist contractor quotation. BOQ item is indicative only.');
    }

    if (ew.hasPathways && ew.pathwaysSqm > 0) {
      this.add({ category: 'EXTERNAL_WORKS', subCategory: 'PATHWAYS', description: 'Paved pedestrian pathways — 50mm concrete paving slabs on sand bed', unit: 'm²', quantity: Math.ceil(ew.pathwaysSqm * 1.05) });
    }

    if (ew.hasRetainingWall && ew.retainingWallLinearM > 0) {
      this.add({ category: 'EXTERNAL_WORKS', subCategory: 'RETAINING_WALL', description: 'Retaining wall — RC or blockwork with drainage and capping', unit: 'm', quantity: Math.ceil(ew.retainingWallLinearM) });
      this.warnings.push('Retaining wall height and design must be confirmed by structural engineer.');
    }

    this.add({ category: 'EXTERNAL_WORKS', subCategory: 'DRAINAGE', description: 'Stormwater drainage — 110mm PVC pipes, inspection chambers and soakaway', unit: 'lump', quantity: 1 });
    this.add({ category: 'EXTERNAL_WORKS', subCategory: 'DRAINAGE', description: 'Septic tank or sewer connection — allow for connections', unit: 'lump', quantity: 1 });
  }

  // ── 14. Landscaping ────────────────────────────────────────────────────────
  private calcLandscaping(model: HouseModelSpec) {
    const ls = model.landscaping;
    if (ls.hasLawnTurf && ls.lawnSqm > 0) {
      this.add({ category: 'LANDSCAPING', subCategory: 'TURF', description: 'Lawn turf — cultivate, topsoil, seed or lay turf', unit: 'm²', quantity: Math.ceil(ls.lawnSqm * 1.05) });
    }
    if (ls.hasGardenBeds && ls.gardenBedsSqm > 0) {
      this.add({ category: 'LANDSCAPING', subCategory: 'GARDEN_BEDS', description: 'Garden beds — excavate, topsoil fill, edge restraint', unit: 'm²', quantity: Math.ceil(ls.gardenBedsSqm) });
    }
    if (ls.hasStonePaving && ls.stonePavingSqm > 0) {
      this.add({ category: 'LANDSCAPING', subCategory: 'PAVING', description: 'Natural stone or porcelain paving slabs — external entertainment areas', unit: 'm²', quantity: Math.ceil(ls.stonePavingSqm * 1.05) });
    }
    if (ls.numberOfTrees > 0) {
      this.add({ category: 'LANDSCAPING', subCategory: 'PLANTING', description: 'Semi-mature trees (supply and plant in prepared pits)', unit: 'nr', quantity: ls.numberOfTrees });
    }
    if (ls.numberOfShrubs > 0) {
      this.add({ category: 'LANDSCAPING', subCategory: 'PLANTING', description: 'Ornamental shrubs in prepared beds (supply and plant)', unit: 'nr', quantity: ls.numberOfShrubs });
    }
    if (ls.hasIrrigation) {
      this.add({ category: 'LANDSCAPING', subCategory: 'IRRIGATION', description: 'Automatic drip and pop-up irrigation system — including controller and solenoid valves', unit: 'lump', quantity: 1 });
    }
  }

  // ── Helper: add item ───────────────────────────────────────────────────────
  private add(partial: Omit<BOQLineItem, 'id' | 'sortOrder'> & { sortOrder?: number }) {
    this.items.push({
      id: uuid(),
      sortOrder: partial.sortOrder ?? this.sortCounter++,
      ...partial,
    });
  }

  // ── Helper: build category summary ────────────────────────────────────────
  private buildCategorySummary(): Record<BOQCategory, number> {
    const summary: Partial<Record<BOQCategory, number>> = {};
    for (const item of this.items) {
      summary[item.category] = (summary[item.category] || 0) + 1;
    }
    return summary as Record<BOQCategory, number>;
  }
}

// Singleton export for simple usage
export const boqEngine = new BOQEngine();
