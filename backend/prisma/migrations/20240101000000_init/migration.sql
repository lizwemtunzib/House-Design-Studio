-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BuildingSystemType" AS ENUM ('BRICK_MASONRY', 'CONCRETE_BLOCK', 'INTERLOCKING_BLOCK', 'MAKIGA_SOIL_BLOCK', 'TIMBER_FRAME', 'LIGHT_STEEL_FRAME', 'GLASS_CURTAIN_WALL', 'PRECAST_PANEL', 'SIP_PANEL');

-- CreateEnum
CREATE TYPE "RoofType" AS ENUM ('HIP', 'GABLE', 'FLAT', 'MONO_PITCH', 'MANSARD', 'BUTTERFLY');

-- CreateEnum
CREATE TYPE "FloorSystemType" AS ENUM ('CONCRETE_SLAB', 'TIMBER_JOISTS', 'STEEL_DECK', 'PRECAST_HOLLOWCORE');

-- CreateEnum
CREATE TYPE "FoundationType" AS ENUM ('STRIP', 'PAD', 'RAFT', 'PILE');

-- CreateEnum
CREATE TYPE "DesignStyle" AS ENUM ('MODERN', 'CONTEMPORARY', 'LUXURY', 'MINIMALIST', 'AFRICAN_VERNACULAR', 'MEDITERRANEAN', 'TIMBER_HEAVY', 'GLASS_HEAVY', 'PREFAB_MODULAR');

-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'EXCEL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT,
    "preferredLang" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "stripeSubId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "projectsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "country" TEXT,
    "city" TEXT,
    "plotSize" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "cityRulesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseDesign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userInput" TEXT NOT NULL,
    "uploadedImageUrl" TEXT,
    "style" "DesignStyle" NOT NULL DEFAULT 'MODERN',
    "status" "DesignStatus" NOT NULL DEFAULT 'PENDING',
    "exteriorRenders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interiorConcepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "landscapingRender" TEXT,
    "floorPlanImage" TEXT,
    "designNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignIteration" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "iteration" INTEGER NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "aiResponse" TEXT,
    "renders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignIteration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseModel" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "totalFloorArea" DOUBLE PRECISION NOT NULL,
    "groundFloorArea" DOUBLE PRECISION NOT NULL,
    "numberOfFloors" INTEGER NOT NULL DEFAULT 1,
    "floorToFloorHeight" DOUBLE PRECISION NOT NULL DEFAULT 2.8,
    "perimeterLength" DOUBLE PRECISION NOT NULL,
    "wallSystem" "BuildingSystemType" NOT NULL,
    "roofType" "RoofType" NOT NULL DEFAULT 'GABLE',
    "roofPitchDegrees" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "floorSystem" "FloorSystemType" NOT NULL DEFAULT 'CONCRETE_SLAB',
    "foundationType" "FoundationType" NOT NULL DEFAULT 'STRIP',
    "externalWallThickness" DOUBLE PRECISION NOT NULL DEFAULT 0.23,
    "internalWallThickness" DOUBLE PRECISION NOT NULL DEFAULT 0.11,
    "totalDoors" INTEGER NOT NULL DEFAULT 0,
    "totalWindows" INTEGER NOT NULL DEFAULT 0,
    "totalGlassArea" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasDriveway" BOOLEAN NOT NULL DEFAULT false,
    "drivewaySqm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasPool" BOOLEAN NOT NULL DEFAULT false,
    "poolSqm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasGarden" BOOLEAN NOT NULL DEFAULT false,
    "gardenSqm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasFencing" BOOLEAN NOT NULL DEFAULT false,
    "fencingLinearM" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "floorArea" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "xPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "doors" INTEGER NOT NULL DEFAULT 1,
    "windows" INTEGER NOT NULL DEFAULT 1,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQ" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BOQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQItem" (
    "id" TEXT NOT NULL,
    "boqId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BOQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostEstimate" (
    "id" TEXT NOT NULL,
    "boqId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priceInputs" JSONB NOT NULL,
    "totalMaterials" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLabour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPerSqm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingSystemSpec" (
    "id" TEXT NOT NULL,
    "systemType" "BuildingSystemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "regions" TEXT[],
    "unitRate" DOUBLE PRECISION,
    "wasteFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "specifications" JSONB NOT NULL,
    "prosAndCons" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingSystemSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityRules" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "maxBuildingHeight" DOUBLE PRECISION,
    "maxCoverageRatio" DOUBLE PRECISION,
    "minFrontSetback" DOUBLE PRECISION,
    "minRearSetback" DOUBLE PRECISION,
    "minSideSetback" DOUBLE PRECISION,
    "minPlotSize" DOUBLE PRECISION,
    "maxFloors" INTEGER,
    "parkingRequired" BOOLEAN NOT NULL DEFAULT false,
    "parkingSpaces" INTEGER,
    "zoningNotes" TEXT,
    "sourceUrl" TEXT,
    "lastVerified" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityRules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Export" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeKb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseDesign_projectId_key" ON "HouseDesign"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseModel_designId_key" ON "HouseModel"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "BOQ_modelId_key" ON "BOQ"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "CostEstimate_boqId_key" ON "CostEstimate"("boqId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingSystemSpec_systemType_key" ON "BuildingSystemSpec"("systemType");

-- CreateIndex
CREATE UNIQUE INDEX "CityRules_country_city_key" ON "CityRules"("country", "city");

-- CreateIndex
CREATE INDEX "CityRules_country_idx" ON "CityRules"("country");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_cityRulesId_fkey" FOREIGN KEY ("cityRulesId") REFERENCES "CityRules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseDesign" ADD CONSTRAINT "HouseDesign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignIteration" ADD CONSTRAINT "DesignIteration_designId_fkey" FOREIGN KEY ("designId") REFERENCES "HouseDesign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseModel" ADD CONSTRAINT "HouseModel_designId_fkey" FOREIGN KEY ("designId") REFERENCES "HouseDesign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "HouseModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQ" ADD CONSTRAINT "BOQ_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "HouseModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostEstimate" ADD CONSTRAINT "CostEstimate_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
