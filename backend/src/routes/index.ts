import { Router } from 'express';
import { authRouter } from './auth.routes';
import { designRouter } from './design.routes';
import { boqRouter } from './boq.routes';
import { costRouter } from './cost.routes';
import { exportRouter } from './export.routes';
import { adminRouter } from './admin.routes';

export const router = Router();

router.use('/auth', authRouter);
router.use('/designs', designRouter);
router.use('/boq', boqRouter);
router.use('/cost', costRouter);
router.use('/export', exportRouter);
router.use('/admin', adminRouter);

// Public routes
router.get('/building-systems', (_req, res) => {
  res.json({ systems: BUILDING_SYSTEMS });
});

router.get('/design-styles', (_req, res) => {
  res.json({ styles: DESIGN_STYLES });
});

const BUILDING_SYSTEMS = [
  { id: 'BRICK_MASONRY', name: 'Brick Masonry', description: 'Traditional fired clay or concrete brick', regions: ['GLOBAL'], icon: '🧱' },
  { id: 'CONCRETE_BLOCK', name: 'Concrete Block', description: 'Hollow or solid concrete masonry units', regions: ['GLOBAL'], icon: '🏗' },
  { id: 'INTERLOCKING_BLOCK', name: 'Interlocking Block', description: 'Dry-stack interlocking concrete blocks', regions: ['AFRICA', 'ASIA'], icon: '🔲' },
  { id: 'MAKIGA_SOIL_BLOCK', name: 'Makiga Soil Block', description: 'Compressed stabilised earth blocks (CSEB)', regions: ['AFRICA'], icon: '🌍' },
  { id: 'TIMBER_FRAME', name: 'Timber Frame', description: 'Platform or balloon timber stud frame', regions: ['EUROPE', 'USA', 'AUSTRALIA'], icon: '🪵' },
  { id: 'LIGHT_STEEL_FRAME', name: 'Light Steel Frame', description: 'Light gauge steel (LGS) stud frame', regions: ['GLOBAL'], icon: '⚙️' },
  { id: 'GLASS_CURTAIN_WALL', name: 'Glass Curtain Wall', description: 'Structural glass facades with aluminium framing', regions: ['GLOBAL'], icon: '🪟' },
  { id: 'PRECAST_PANEL', name: 'Precast Concrete Panel', description: 'Factory-cast or tilt-up concrete wall panels', regions: ['GLOBAL'], icon: '🏭' },
  { id: 'SIP_PANEL', name: 'SIP Panel', description: 'Structural Insulated Panels (OSB + EPS core)', regions: ['EUROPE', 'USA', 'AUSTRALIA'], icon: '🏠' },
];

const DESIGN_STYLES = [
  { id: 'MODERN', name: 'Modern', description: 'Clean lines, flat or low-pitch roof, large windows' },
  { id: 'CONTEMPORARY', name: 'Contemporary', description: 'Sleek, current trends, mixed materials' },
  { id: 'LUXURY', name: 'Luxury', description: 'Premium finishes, bold features, statement architecture' },
  { id: 'MINIMALIST', name: 'Minimalist', description: 'Less is more, monochrome palette, hidden details' },
  { id: 'AFRICAN_VERNACULAR', name: 'African Vernacular', description: 'Local materials, earthy tones, climate-responsive' },
  { id: 'MEDITERRANEAN', name: 'Mediterranean', description: 'Terracotta, arches, courtyards, warm stone' },
  { id: 'TIMBER_HEAVY', name: 'Timber Heavy', description: 'Natural wood dominates exterior and interior' },
  { id: 'GLASS_HEAVY', name: 'Glass Heavy', description: 'Floor-to-ceiling glazing, steel and glass interplay' },
  { id: 'PREFAB_MODULAR', name: 'Prefab Modular', description: 'Factory-made modules assembled on site' },
];
