import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed building system specs
  const systems = [
    {
      systemType: 'BRICK_MASONRY' as const,
      name: 'Brick Masonry',
      description: 'Traditional fired clay or sand-lime brick construction. Widely used globally. Excellent thermal mass and durability.',
      regions: ['AFRICA', 'EUROPE', 'MIDDLE_EAST', 'ASIA'],
      unitRate: 85,
      wasteFactor: 0.05,
      specifications: {
        brickSize: '230x110x76mm',
        bricksPerSqm: 60,
        mortarRatio: '1:4',
        wallThicknessExternal: 0.23,
        wallThicknessInternal: 0.11,
      },
    },
    {
      systemType: 'CONCRETE_BLOCK' as const,
      name: 'Concrete Block',
      description: 'Hollow or solid concrete masonry units. Fast construction, good strength, widely available.',
      regions: ['GLOBAL'],
      unitRate: 65,
      wasteFactor: 0.05,
      specifications: {
        blockSize: '400x200x200mm',
        blocksPerSqm: 12.5,
        mortarRatio: '1:3',
      },
    },
    {
      systemType: 'MAKIGA_SOIL_BLOCK' as const,
      name: 'Makiga Soil-Stabilised Block (CSEB)',
      description: 'Compressed stabilised earth blocks. Highly sustainable, low-cost, locally sourced. Ideal for African markets. Up to 60% cheaper than fired brick.',
      regions: ['AFRICA', 'ASIA'],
      unitRate: 25,
      wasteFactor: 0.08,
      specifications: {
        blockSize: '290x140x90mm',
        blocksPerSqm: 25,
        cementContent: '8% by volume',
        machineRequired: 'Makiga block press or similar',
      },
    },
    {
      systemType: 'TIMBER_FRAME' as const,
      name: 'Timber Frame',
      description: 'Platform or balloon timber stud frame. Fast construction, good insulation performance, renewable material.',
      regions: ['EUROPE', 'USA', 'AUSTRALIA', 'CANADA'],
      unitRate: 120,
      wasteFactor: 0.10,
      specifications: {
        studSize: '90x45mm',
        studSpacing: '450mm c/c',
        sheathingThickness: '9mm OSB',
        liningThickness: '12mm plasterboard',
      },
    },
    {
      systemType: 'LIGHT_STEEL_FRAME' as const,
      name: 'Light Gauge Steel Frame',
      description: 'Cold-formed steel C-sections. Termite-proof, dimensionally stable, fast erection, recyclable.',
      regions: ['GLOBAL'],
      unitRate: 140,
      wasteFactor: 0.05,
      specifications: {
        studSize: '89x41x12mm C-section',
        studSpacing: '600mm c/c',
        weightPerSqm: '10kg/m²',
      },
    },
    {
      systemType: 'SIP_PANEL' as const,
      name: 'SIP Panel (Structural Insulated Panel)',
      description: 'Prefabricated panels: OSB + EPS + OSB. Excellent insulation, fast assembly, minimal site waste.',
      regions: ['EUROPE', 'USA', 'AUSTRALIA'],
      unitRate: 180,
      wasteFactor: 0.08,
      specifications: {
        totalThickness: '165mm',
        osb: '11mm each face',
        eps: '143mm core',
        panelWidth: '1220mm standard',
      },
    },
    {
      systemType: 'GLASS_CURTAIN_WALL' as const,
      name: 'Glass Curtain Wall',
      description: 'Structural aluminium frame with double-glazed units. Maximum transparency, contemporary aesthetics. Premium cost.',
      regions: ['GLOBAL'],
      unitRate: 450,
      wasteFactor: 0.05,
      specifications: {
        glazing: '6/12/6 DGU clear float',
        frame: 'Aluminium with thermal break',
        aluminiumWeight: '6.5 kg/m²',
      },
    },
  ];

  for (const s of systems) {
    await prisma.buildingSystemSpec.upsert({
      where: { systemType: s.systemType },
      create: { ...s, prosAndCons: {} },
      update: { ...s },
    });
  }
  console.log(`✓ Seeded ${systems.length} building systems`);

  // Seed sample city rules
  const cityRules = [
    { country: 'Kenya', city: 'Nairobi', maxBuildingHeight: 18, maxCoverageRatio: 0.5, minFrontSetback: 6, minRearSetback: 3, minSideSetback: 1.5, maxFloors: 6, parkingRequired: true, parkingSpaces: 2 },
    { country: 'South Africa', city: 'Cape Town', maxBuildingHeight: 12, maxCoverageRatio: 0.4, minFrontSetback: 4.5, minRearSetback: 3, minSideSetback: 1.5, maxFloors: 4 },
    { country: 'UAE', city: 'Dubai', maxBuildingHeight: 9, maxCoverageRatio: 0.55, minFrontSetback: 5, minRearSetback: 3, minSideSetback: 2, maxFloors: 3, parkingRequired: true, parkingSpaces: 2 },
    { country: 'Nigeria', city: 'Lagos', maxBuildingHeight: 15, maxCoverageRatio: 0.6, minFrontSetback: 6, minRearSetback: 3, minSideSetback: 1.5, maxFloors: 5 },
    { country: 'Ghana', city: 'Accra', maxBuildingHeight: 9, maxCoverageRatio: 0.5, minFrontSetback: 5, minRearSetback: 3, minSideSetback: 1, maxFloors: 3 },
    { country: 'United Kingdom', city: 'London', maxBuildingHeight: 8, maxCoverageRatio: 0.35, minFrontSetback: 3, minRearSetback: 5, minSideSetback: 1, maxFloors: 2 },
    { country: 'Tanzania', city: 'Dar es Salaam', maxBuildingHeight: 9, maxCoverageRatio: 0.5, minFrontSetback: 5, minRearSetback: 3, minSideSetback: 1.5, maxFloors: 3 },
    { country: 'Uganda', city: 'Kampala', maxBuildingHeight: 12, maxCoverageRatio: 0.55, minFrontSetback: 4.5, minRearSetback: 3, minSideSetback: 1.5, maxFloors: 4 },
  ];

  for (const r of cityRules) {
    await prisma.cityRules.upsert({
      where: { country_city: { country: r.country, city: r.city } },
      create: { ...r, zoningNotes: 'Seeded data. Verify with local authority before relying on this.', isVerified: false },
      update: {},
    });
  }
  console.log(`✓ Seeded ${cityRules.length} city rules`);

  console.log('✅ Database seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
