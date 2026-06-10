# House Design Studio — System Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE (PWA)                               │
│                     React 18 + TypeScript + Vite                            │
│              Mobile-first  |  Offline-capable  |  Installable               │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Step 1   │  │ Step 2   │  │ Step 3   │  │ Step 4   │  │ Step 5   │    │
│  │  INPUT   │→ │  DESIGN  │→ │STRUCTURE │→ │   BOQ    │→ │  COST    │    │
│  │(text/img)│  │(AI art)  │  │(layout)  │  │(table)   │  │(prices)  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                │                    │
                │ REST API            │ REST API
                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (Express.js)                             │
│                                                                             │
│  /auth  /designs  /boq  /cost  /export  /admin                              │
│  Rate limiting | JWT auth | Compression | CORS                              │
└───────────────┬─────────────────────────────────────────────────────────────┘
                │
        ┌───────┴──────────────────────────────────────────────┐
        │                                                       │
        ▼                                                       ▼
┌───────────────────┐                              ┌───────────────────────────┐
│    AI LAYER       │                              │   DETERMINISTIC ENGINE    │
│   (Interpretation │                              │   (Calculations ONLY)     │
│    & Visuals)     │                              │                           │
│                   │                              │  ┌─────────────────────┐  │
│ ┌───────────────┐ │                              │  │     BOQ ENGINE      │  │
│ │ Planning AI   │ │  → HouseModelSpec JSON →    │  │  Rule-based. 100%   │  │
│ │ (Claude API)  │ │                              │  │  reproducible.      │  │
│ │               │ │  Converts user intent        │  │  NO AI involved.    │  │
│ │ Input:  text, │ │  into structured model.      │  │                     │  │
│ │  image, chat  │ │  Does NOT calculate BOQ.     │  │  8 wall systems:    │  │
│ │               │ │                              │  │  • Brick masonry    │  │
│ │ Output: JSON  │ │                              │  │  • Concrete block   │  │
│ └───────────────┘ │                              │  │  • Timber frame     │  │
│                   │                              │  │  • LGS frame        │  │
│ ┌───────────────┐ │                              │  │  • Glass CW         │  │
│ │ Visual AI     │ │                              │  │  • Makiga CSEB      │  │
│ │ (DALL-E /     │ │                              │  │  • SIP panels       │  │
│ │  Stability /  │ │                              │  │  • Precast panels   │  │
│ │  Replicate)   │ │                              │  │  • Interlocking blk │  │
│ │               │ │                              │  └─────────────────────┘  │
│ │ Input:  text  │ │                              │                           │
│ │ Output: images│ │                              │  ┌─────────────────────┐  │
│ └───────────────┘ │                              │  │    COST ENGINE      │  │
│                   │                              │  │  Qty × User Price   │  │
│  AI CANNOT:       │                              │  │  = Deterministic    │  │
│  • Calculate BOQ  │                              │  │    cost. No AI.     │  │
│  • Estimate costs │                              │  └─────────────────────┘  │
│  • Approve plans  │                              │                           │
└───────────────────┘                              │  ┌─────────────────────┐  │
                                                   │  │   EXPORT ENGINE     │  │
                                                   │  │  PDF (PDFKit)       │  │
                                                   │  │  Excel (ExcelJS)    │  │
                                                   │  └─────────────────────┘  │
                                                   └───────────────────────────┘
                                                                │
                                                                ▼
                                                   ┌───────────────────────────┐
                                                   │       DATA LAYER          │
                                                   │                           │
                                                   │  PostgreSQL (Prisma ORM)  │
                                                   │  • Users & subscriptions  │
                                                   │  • Projects & designs     │
                                                   │  • House models           │
                                                   │  • BOQ items              │
                                                   │  • Cost estimates         │
                                                   │  • City rules             │
                                                   │  • Export history         │
                                                   │                           │
                                                   │  Redis (optional)         │
                                                   │  • Session caching        │
                                                   │  • AI response caching    │
                                                   └───────────────────────────┘
```

---

## Module Separation in Codebase

```
house-design-studio/
├── backend/                        ← Node.js + Express + TypeScript
│   ├── prisma/
│   │   └── schema.prisma           ← Full DB schema (16 models)
│   └── src/
│       ├── config/                 ← Environment config
│       ├── middleware/
│       │   ├── auth.ts             ← JWT authentication
│       │   └── errorHandler.ts     ← Centralised error handling
│       ├── routes/
│       │   ├── auth.routes.ts      ← Register, login, /me
│       │   ├── design.routes.ts    ← AI generation pipeline
│       │   ├── boq.routes.ts       ← BOQ fetch + recalculate
│       │   ├── cost.routes.ts      ← Cost calculation
│       │   ├── export.routes.ts    ← PDF and Excel export
│       │   └── admin.routes.ts     ← Admin panel + city rules
│       ├── modules/
│       │   ├── ai/                 ← AI LAYER (ONLY for interpretation/visuals)
│       │   │   ├── planning-ai.service.ts   ← Claude: text → HouseModelSpec JSON
│       │   │   ├── visual-ai.service.ts     ← Image gen (DALL-E/Stability/mock)
│       │   │   └── ai.types.ts
│       │   ├── boq/                ← BOQ ENGINE (DETERMINISTIC - no AI)
│       │   │   ├── boq-engine.ts   ← Main orchestrator
│       │   │   ├── boq.types.ts
│       │   │   └── systems/
│       │   │       ├── brick.system.ts      ← Brick masonry calculations
│       │   │       ├── block.system.ts      ← Concrete block calculations
│       │   │       ├── timber.system.ts     ← Timber frame calculations
│       │   │       ├── steel.system.ts      ← LGS frame calculations
│       │   │       ├── glass.system.ts      ← Glass curtain wall calculations
│       │   │       ├── makiga.system.ts     ← Makiga CSEB calculations
│       │   │       ├── sip.system.ts        ← SIP panel calculations
│       │   │       ├── precast.system.ts    ← Precast panel calculations
│       │   │       └── interlocking.system.ts ← Interlocking block calculations
│       │   ├── cost/               ← COST ENGINE (DETERMINISTIC - no AI)
│       │   │   ├── cost-engine.ts  ← Qty × unitPrice calculation
│       │   │   └── cost.types.ts
│       │   └── export/
│       │       ├── pdf-export.service.ts    ← BOQ PDF generation (PDFKit)
│       │       └── excel-export.service.ts  ← BOQ Excel workbook (ExcelJS)
│       └── shared/
│           └── types/
│               └── house-model.types.ts     ← Core shared type definitions
│
└── frontend/                       ← React 18 + TypeScript + Vite PWA
    └── src/
        ├── App.tsx                  ← Router, lazy loading, PWA wrapper
        ├── i18n/                    ← EN, AR, FR, SW translations
        ├── stores/
        │   ├── user.store.ts        ← Auth state (persisted)
        │   └── design.store.ts      ← Wizard state, BOQ items, prices
        ├── services/
        │   └── api.service.ts       ← Axios client + all API calls
        ├── pages/
        │   ├── Landing.tsx          ← Marketing page
        │   ├── Auth.tsx             ← Login / Register
        │   ├── Dashboard.tsx        ← Project list
        │   ├── wizard/
        │   │   ├── WizardLayout.tsx ← Step progress bar + routing
        │   │   ├── Step1Input.tsx   ← House intent form
        │   │   ├── Step2Design.tsx  ← AI renders + iteration
        │   │   ├── Step3Structure.tsx ← Building system + floor plan editor
        │   │   ├── Step4BOQ.tsx     ← BOQ table with categories
        │   │   └── Step5Cost.tsx    ← Price input + cost calculation
        │   └── Export.tsx           ← PDF/Excel download
        └── components/
            ├── FloorPlanEditor.tsx  ← Canvas-based drag-and-drop editor
            ├── BOQTable.tsx         ← Collapsible category table
            └── ui/                  ← Toaster, FullScreenLoader
```

---

## API Boundaries Between AI and Deterministic Engine

```
User Request
     │
     ▼
POST /api/designs/:id/generate
     │
     ├── 1. VISUAL AI ──────────────────────────────────────────────────────
     │        Input : { intent: HouseIntentModel, style }
     │        Output: { exteriorRenders[], interiorConcepts[], landscapingRender, designNotes }
     │        Provider: DALL-E 3 / Stable Diffusion XL / Replicate / Mock
     │        CANNOT: calculate anything. Returns images only.
     │
     ├── 2. PLANNING AI (Claude) ───────────────────────────────────────────
     │        Input : { intent, designNotes }
     │        Output: HouseModelSpec JSON (structured building model)
     │        CANNOT: generate images, calculate BOQ, estimate costs
     │        Output is: dimensions, rooms, systems, openings, external works
     │
     ├── 3. BOQ ENGINE (deterministic) ─────────────────────────────────────
     │        Input : HouseModelSpec (from step 2)
     │        Output: BOQResult with line items
     │        RULE: No AI. Same input → same output. Always.
     │        Calculates: excavation, foundation, walls, roof, finishes,
     │                    openings, external works, landscaping
     │
     └── 4. COST ENGINE (deterministic, on user request) ───────────────────
              Input : BOQResult + PriceInputItem[] (user-provided prices)
              Output: CostResult with breakdown
              RULE: No AI. Qty × unitPrice = cost. Always.

AI owns: interpretation and inspiration
Code owns: all quantities and costs
```

---

## Data Flow

```
User Input (text / image / template)
        │
        │  POST /designs/:id/generate
        ▼
   HouseIntentModel
   {bedrooms, style, wallSystem, hasPool, ...}
        │
        ├── Visual AI ──────── exteriorRenders[], interiorConcepts[], landscapingRender
        │
        └── Planning AI ──────► HouseModelSpec (JSON)
                                {
                                  totalFloorArea, groundFloorArea,
                                  numberOfFloors, perimeterLength,
                                  wallSystem, roofType, foundationType,
                                  rooms[], openings[],
                                  externalWorks{}, landscaping{},
                                  totalExternalWallArea, totalInternalWallArea,
                                  totalOpeningsArea, roofArea, ...
                                }
                                        │
                                        ▼
                                   BOQ ENGINE
                                   (14 calculation sections)
                                        │
                                        ▼
                                   BOQResult
                                   {items: BOQLineItem[], warnings[], assumptions[]}
                                        │
                                        ├── Stored in DB (PostgreSQL)
                                        │
                                        └── User enters unit prices
                                                │
                                                ▼
                                           COST ENGINE
                                           {totalMaterials, totalLabour,
                                            totalCost, costPerSqm,
                                            breakdown by category}
                                                │
                                                ▼
                                           EXPORT ENGINE
                                           ├── PDF (BOQ + cost report)
                                           └── Excel (multi-sheet workbook)
```

---

## Recommended Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React 18 + TypeScript | Component-based, strong ecosystem |
| Build | Vite | Fast HMR, excellent PWA plugin |
| Styling | TailwindCSS | Mobile-first, rapid UI development |
| State | Zustand | Simple, lightweight, persistent |
| Data fetching | TanStack Query | Caching, refetch, loading states |
| PWA | vite-plugin-pwa | Workbox-powered, offline support |
| i18n | i18next | Multi-language, RTL support |
| Backend | Node.js + Express | JavaScript consistency, fast |
| ORM | Prisma | Type-safe, migrations, relations |
| Database | PostgreSQL | Relational, reliable, JSONB support |
| AI (Planning) | Anthropic Claude API | Best-in-class structured JSON output |
| AI (Visuals) | Abstracted provider | Pluggable: DALL-E, Stability, Replicate |
| PDF Export | PDFKit | Programmatic, no browser required |
| Excel Export | ExcelJS | Full workbook control, formatting |
| Auth | JWT + bcryptjs | Stateless, scalable |
| Payments | Stripe | Industry standard subscription billing |

---

## Monetization Architecture

```
FREE tier:
  • 1 project
  • AI design generation
  • Basic BOQ (all calculations)
  • PDF export (with watermark)
  • Mock image generation

PRO ($9.99/month):
  • Unlimited projects
  • Full BOQ + cost estimation
  • PDF + Excel export (no watermark)
  • All 9 building systems
  • Real image generation (API credits)
  • Priority support

ENTERPRISE ($29.99/month):
  • Everything in Pro
  • API access
  • Multi-user workspace
  • White-label branding options
  • Dedicated support
  • City rules data access

Stripe integration:
  POST /api/auth/create-checkout → Stripe Checkout Session
  POST /api/webhooks/stripe → Handle subscription events
  Subscription status stored in Subscription model
  Access controlled via requirePro() middleware
```

---

## City / Country Rules Engine

```
CityRules model (stored in PostgreSQL):
  country, city, maxBuildingHeight, maxCoverageRatio,
  minFrontSetback, minRearSetback, minSideSetback,
  maxFloors, parkingRequired, zoningNotes

Usage:
  1. User provides country + city on project creation
  2. System looks up CityRules (if available)
  3. Rules displayed as guidance during design
  4. Never claim legal approval — "compliance guidance only"
  5. If no data: use safe default assumptions

Admin panel allows:
  • Import city rules via CSV
  • Edit rules per city
  • Mark rules as verified/unverified
  • Add source URLs and last verification dates
```

---

## Important Principles (Enforced in Code)

1. **AI is for interpretation and inspiration only** — visual output and JSON model generation
2. **BOQ is deterministic** — `BOQEngine.calculate()` is pure function, same input = same output
3. **Cost is deterministic** — `CostEngine.calculate()` is pure function, qty × price
4. **All calculations in TypeScript** — not in AI prompts, not in frontend
5. **Transparency** — every BOQ includes `warnings[]` and `assumptions[]`
6. **Global-first** — 9 construction systems, 4 languages, regional benchmarks
7. **No claim of authority** — never certify, approve, or guarantee
