import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDesignStore } from '../../stores/design.store';
import { designApi, boqApi } from '../../services/api.service';
import { toast } from '../../components/ui/Toaster';
import { FloorPlanEditor } from '../../components/FloorPlanEditor';

const WALL_SYSTEMS = [
  { id: 'BRICK_MASONRY', label: 'Brick Masonry', icon: '🧱', desc: '230×110×76mm fired brick' },
  { id: 'CONCRETE_BLOCK', label: 'Concrete Block', icon: '🏗', desc: '400×200×200mm hollow block' },
  { id: 'INTERLOCKING_BLOCK', label: 'Interlocking Block', icon: '🔲', desc: 'Dry-stack hollow block' },
  { id: 'MAKIGA_SOIL_BLOCK', label: 'Makiga CSEB', icon: '🌍', desc: 'Compressed stabilised earth' },
  { id: 'TIMBER_FRAME', label: 'Timber Frame', icon: '🪵', desc: '90×45mm studs at 450mm c/c' },
  { id: 'LIGHT_STEEL_FRAME', label: 'Light Steel Frame', icon: '⚙️', desc: 'LGS C-sections at 600mm c/c' },
  { id: 'GLASS_CURTAIN_WALL', label: 'Glass Curtain Wall', icon: '🪟', desc: 'Unitised aluminium + DGU' },
  { id: 'SIP_PANEL', label: 'SIP Panel', icon: '📦', desc: '165mm OSB+EPS+OSB panel' },
  { id: 'PRECAST_PANEL', label: 'Precast Panel', icon: '🏭', desc: '150mm RC tilt-up/factory' },
];

const ROOF_TYPES = [
  { id: 'GABLE', label: 'Gable', icon: '⛺' },
  { id: 'HIP', label: 'Hip', icon: '🏠' },
  { id: 'FLAT', label: 'Flat', icon: '▬' },
  { id: 'MONO_PITCH', label: 'Mono Pitch', icon: '📐' },
  { id: 'MANSARD', label: 'Mansard', icon: '🏰' },
];

const FOUNDATION_TYPES = [
  { id: 'STRIP', label: 'Strip Foundation', desc: 'Standard for masonry walls' },
  { id: 'RAFT', label: 'Raft Foundation', desc: 'Spreads load over full footprint' },
  { id: 'PAD', label: 'Pad Footings', desc: 'For column/frame structures' },
  { id: 'PILE', label: 'Pile Foundation', desc: 'For soft soils, multi-storey' },
];

export default function Step3Structure() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { projectId, setStep, intent, setIntent, setStructureModel } = useDesignStore();
  const [selectedWall, setSelectedWall] = useState(intent.wallSystem || 'BRICK_MASONRY');
  const [selectedRoof, setSelectedRoof] = useState('GABLE');
  const [selectedFoundation, setSelectedFoundation] = useState('STRIP');

  const { data: project, isLoading } = useQuery({
    queryKey: ['design', projectId],
    queryFn: () => designApi.getDesign(projectId!),
    enabled: !!projectId,
  });

  const model = project?.houseDesign?.houseModel;
  const rooms = model?.floors?.flatMap((f: any) => f.rooms.map((r: any) => ({ ...r, floorNumber: f.floorNumber }))) ?? [];

  const updateModel = useMutation({
    mutationFn: (updates: object) => designApi.updateModel(projectId!, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['design', projectId] });
    },
  });

  const recalculateBOQ = useMutation({
    mutationFn: () => boqApi.recalculate(projectId!),
    onSuccess: (data) => {
      toast.success(`BOQ recalculated — ${data.itemCount} items`);
      setStep(4);
    },
    onError: () => toast.error('BOQ calculation failed'),
  });

  const handleProceed = () => {
    updateModel.mutate({ wallSystem: selectedWall, roofType: selectedRoof, foundationType: selectedFoundation });
    setIntent({ wallSystem: selectedWall });
    if (model) {
      setStructureModel({
        wallSystem: selectedWall,
        roofType: selectedRoof,
        foundationType: selectedFoundation,
        totalFloorArea: model.totalFloorArea,
        groundFloorArea: model.groundFloorArea,
        numberOfFloors: model.numberOfFloors,
        rooms,
      });
    }
    recalculateBOQ.mutate();
  };

  return (
    <div className="space-y-6 pb-safe">
      {/* Model summary */}
      {model && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Floor Area', value: `${model.totalFloorArea?.toFixed(0)} m²` },
            { label: 'Floors', value: model.numberOfFloors },
            { label: 'Perimeter', value: `${model.perimeterLength?.toFixed(0)} m` },
          ].map(({ label, value }) => (
            <div key={label} className="card p-3 text-center">
              <p className="text-lg font-bold text-brand-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Floor Plan Editor */}
      {rooms.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📐 {t('structure.floorPlan')}</h3>
          <FloorPlanEditor rooms={rooms} onUpdate={(updatedRooms) => console.log('rooms updated', updatedRooms)} />
          <p className="text-xs text-gray-400 mt-2">Drag rooms to reposition. Tap a room to edit dimensions.</p>
        </div>
      )}

      {/* Wall system */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🧱 {t('structure.wallSystem')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {WALL_SYSTEMS.map((s) => (
            <button key={s.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedWall === s.id ? 'border-brand-800 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setSelectedWall(s.id)}>
              <span className="text-2xl flex-shrink-0 mt-0.5">{s.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${selectedWall === s.id ? 'text-brand-800' : 'text-gray-800'}`}>{s.label}</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">{s.desc}</p>
              </div>
              {selectedWall === s.id && <span className="ml-auto text-brand-800 flex-shrink-0">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Roof type */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🏠 {t('structure.roofType')}</h3>
        <div className="flex flex-wrap gap-2">
          {ROOF_TYPES.map((r) => (
            <button key={r.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${selectedRoof === r.id ? 'border-brand-800 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-600'}`} onClick={() => setSelectedRoof(r.id)}>
              <span>{r.icon}</span> {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Foundation type */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🏗 {t('structure.foundationType')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {FOUNDATION_TYPES.map((f) => (
            <button key={f.id} className={`p-3 rounded-xl border-2 text-left transition-all ${selectedFoundation === f.id ? 'border-brand-800 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setSelectedFoundation(f.id)}>
              <p className={`text-sm font-semibold ${selectedFoundation === f.id ? 'text-brand-800' : 'text-gray-800'}`}>{f.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1" onClick={() => setStep(2)}>← {t('common.back')}</button>
        <button className="btn-primary flex-1" onClick={handleProceed} disabled={recalculateBOQ.isPending || !model}>
          {recalculateBOQ.isPending ? '⚙️ Calculating BOQ...' : '📋 Generate BOQ →'}
        </button>
      </div>
    </div>
  );
}
