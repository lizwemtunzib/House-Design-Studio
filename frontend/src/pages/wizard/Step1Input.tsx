import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useDesignStore } from '../../stores/design.store';
import { designApi } from '../../services/api.service';
import { toast } from '../../components/ui/Toaster';

const STYLES = [
  { id: 'MODERN', label: 'Modern', icon: '🏙' },
  { id: 'CONTEMPORARY', label: 'Contemporary', icon: '✨' },
  { id: 'LUXURY', label: 'Luxury', icon: '👑' },
  { id: 'MINIMALIST', label: 'Minimalist', icon: '⬜' },
  { id: 'AFRICAN_VERNACULAR', label: 'African Vernacular', icon: '🌍' },
  { id: 'MEDITERRANEAN', label: 'Mediterranean', icon: '🏺' },
  { id: 'TIMBER_HEAVY', label: 'Timber Heavy', icon: '🪵' },
  { id: 'GLASS_HEAVY', label: 'Glass Heavy', icon: '🪟' },
];

const WALL_SYSTEMS = [
  { id: 'BRICK_MASONRY', label: 'Brick Masonry', icon: '🧱' },
  { id: 'CONCRETE_BLOCK', label: 'Concrete Block', icon: '🏗' },
  { id: 'INTERLOCKING_BLOCK', label: 'Interlocking Block', icon: '🔲' },
  { id: 'MAKIGA_SOIL_BLOCK', label: 'Makiga CSEB', icon: '🌍' },
  { id: 'TIMBER_FRAME', label: 'Timber Frame', icon: '🪵' },
  { id: 'LIGHT_STEEL_FRAME', label: 'Light Steel Frame', icon: '⚙️' },
  { id: 'GLASS_CURTAIN_WALL', label: 'Glass Curtain Wall', icon: '🪟' },
  { id: 'SIP_PANEL', label: 'SIP Panel', icon: '📦' },
];

export default function Step1Input() {
  const { t } = useTranslation();
  const { intent, setIntent, projectId, setStep } = useDesignStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const generateMutation = useMutation({
    mutationFn: () => designApi.generateDesign(projectId!, intent, intent.referenceImage),
    onSuccess: () => {
      toast.info('Design generation started — this takes 30–60 seconds');
      setStep(2);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Generation failed. Please try again.'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIntent({ referenceImage: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const canProceed = projectId && (intent.textDescription.length > 10 || intent.bedrooms > 0);

  return (
    <div className="space-y-6 pb-safe">
      {/* Text description */}
      <div>
        <label className="label">{t('intent.description')}</label>
        <textarea
          className="input-field min-h-[100px] resize-none"
          placeholder={t('intent.descriptionPlaceholder')}
          value={intent.textDescription}
          onChange={(e) => setIntent({ textDescription: e.target.value })}
          maxLength={500}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{intent.textDescription.length}/500</p>
      </div>

      {/* Reference image upload */}
      <div>
        <label className="label">{t('intent.uploadImage')} <span className="text-gray-400 font-normal">(optional)</span></label>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all"
          onClick={() => fileRef.current?.click()}
        >
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="reference" className="w-full h-40 object-cover rounded-lg" />
              <button className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow text-gray-600 text-xs" onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setIntent({ referenceImage: undefined }); }}>✕</button>
            </div>
          ) : (
            <div className="py-4">
              <div className="text-3xl mb-2">📸</div>
              <p className="text-sm text-gray-500">Tap to upload inspiration image</p>
              <p className="text-xs text-gray-400 mt-1">{t('intent.uploadHint')}</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Room counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'bedrooms', label: t('intent.bedrooms'), icon: '🛏', min: 1, max: 20 },
          { key: 'bathrooms', label: t('intent.bathrooms'), icon: '🚿', min: 1, max: 20 },
          { key: 'garages', label: t('intent.garages'), icon: '🚗', min: 0, max: 10 },
          { key: 'floors', label: t('intent.floors'), icon: '🏢', min: 1, max: 5 },
        ].map(({ key, label, icon, min, max }) => (
          <div key={key} className="card p-3 text-center">
            <p className="text-xl mb-1">{icon}</p>
            <p className="text-xs text-gray-500 mb-2">{label}</p>
            <div className="flex items-center justify-center gap-3">
              <button className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center active:scale-90 transition-transform" onClick={() => setIntent({ [key]: Math.max(min, (intent as any)[key] - 1) })}>−</button>
              <span className="font-bold text-brand-800 text-lg w-5 text-center">{(intent as any)[key]}</span>
              <button className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center active:scale-90 transition-transform" onClick={() => setIntent({ [key]: Math.min(max, (intent as any)[key] + 1) })}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Area */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('intent.targetArea')}</label>
          <input className="input-field" type="number" min="50" max="2000" value={intent.targetArea} onChange={(e) => setIntent({ targetArea: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">{t('intent.plotSize')}</label>
          <input className="input-field" type="number" min="100" max="10000" value={intent.plotSize} onChange={(e) => setIntent({ plotSize: Number(e.target.value) })} />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('intent.country')}</label>
          <input className="input-field" placeholder="e.g. Kenya" value={intent.country} onChange={(e) => setIntent({ country: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('intent.city')}</label>
          <input className="input-field" placeholder="e.g. Nairobi" value={intent.city} onChange={(e) => setIntent({ city: e.target.value })} />
        </div>
      </div>

      {/* Style picker */}
      <div>
        <label className="label">{t('intent.style')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STYLES.map((s) => (
            <button key={s.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${intent.style === s.id ? 'border-brand-800 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`} onClick={() => setIntent({ style: s.id })}>
              <span>{s.icon}</span> <span className="text-xs leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wall system picker */}
      <div>
        <label className="label">{t('intent.wallSystem')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WALL_SYSTEMS.map((s) => (
            <button key={s.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${intent.wallSystem === s.id ? 'border-brand-800 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`} onClick={() => setIntent({ wallSystem: s.id })}>
              <span>{s.icon}</span> <span className="text-xs leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Extras */}
      <div>
        <label className="label">{t('intent.extras')}</label>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'hasPool', label: `🏊 ${t('intent.pool')}` },
            { key: 'hasGarden', label: `🌿 ${t('intent.garden')}` },
            { key: 'hasDriveway', label: `🚗 ${t('intent.driveway')}` },
            { key: 'hasFencing', label: `🏗 ${t('intent.fencing')}` },
          ].map(({ key, label }) => (
            <button key={key} className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${(intent as any)[key] ? 'border-brand-800 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-600'}`} onClick={() => setIntent({ [key]: !(intent as any)[key] })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Additional */}
      <div>
        <label className="label">{t('intent.additional')}</label>
        <input className="input-field" placeholder="e.g. rooftop terrace, home office, disability access..." value={intent.additionalRequirements} onChange={(e) => setIntent({ additionalRequirements: e.target.value })} />
      </div>

      {/* CTA */}
      <div className="pt-2">
        <button
          className="btn-primary w-full py-4 text-base"
          disabled={!canProceed || generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
        >
          {generateMutation.isPending ? '✨ Generating Your Design...' : '✨ Generate AI Design →'}
        </button>
        {!projectId && <p className="text-xs text-red-500 text-center mt-2">Create a project first from the dashboard</p>}
      </div>
    </div>
  );
}
