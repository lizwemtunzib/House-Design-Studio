import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDesignStore } from '../../stores/design.store';
import { designApi } from '../../services/api.service';
import { toast } from '../../components/ui/Toaster';

export default function Step2Design() {
  const { t } = useTranslation();
  const { projectId, setStep, setDesignResult, intent, setIntent } = useDesignStore();
  const [iteratePrompt, setIteratePrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'exterior' | 'interior' | 'landscaping'>('exterior');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isIterating, setIsIterating] = useState(false);

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ['design', projectId],
    queryFn: () => designApi.getDesign(projectId!),
    refetchInterval: (q) => {
      const status = q.state.data?.houseDesign?.status;
      return status === 'GENERATING' ? 3000 : false;
    },
    enabled: !!projectId,
  });

  const design = project?.houseDesign;
  const status = design?.status;

  useEffect(() => {
    if (status === 'READY' && design) {
      setDesignResult({
        exteriorRenders: design.exteriorRenders ?? [],
        interiorConcepts: design.interiorConcepts ?? [],
        landscapingRender: design.landscapingRender,
        designNotes: design.designNotes ?? '',
        status: 'READY',
      });
    }
  }, [status, design, setDesignResult]);

  const handleIterate = async () => {
    if (!iteratePrompt.trim() || !projectId) return;
    setIsIterating(true);
    try {
      await designApi.iterateDesign(projectId, iteratePrompt);
      toast.info('Design update requested — refreshing in a few seconds...');
      setIteratePrompt('');
      setTimeout(() => refetch(), 5000);
    } catch {
      toast.error('Update failed. Please try again.');
    } finally {
      setIsIterating(false);
    }
  };

  const currentImages = activeTab === 'exterior'
    ? (design?.exteriorRenders ?? [])
    : activeTab === 'interior'
    ? (design?.interiorConcepts ?? [])
    : design?.landscapingRender ? [design.landscapingRender] : [];

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-800 rounded-full" /></div>;

  if (status === 'GENERATING' || status === 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full bg-brand-100 animate-ping opacity-30" />
          <div className="relative w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center text-4xl animate-pulse">🏡</div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('design.generating')}</h2>
        <p className="text-gray-500 text-sm max-w-xs">{t('design.generatingHint')}</p>
        <div className="flex gap-1.5 mt-6">
          {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-brand-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Generation Failed</h2>
        <p className="text-gray-500 text-sm mb-6">Something went wrong. Please try generating again.</p>
        <button className="btn-secondary" onClick={() => setStep(1)}>← Back to Input</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-safe">
      {design?.designNotes && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
          <p className="text-sm font-medium text-brand-800 mb-1">✨ AI Design Notes</p>
          <p className="text-sm text-brand-700 leading-relaxed">{design.designNotes}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1">
        {[
          { id: 'exterior' as const, label: `🏡 ${t('design.exterior')}` },
          { id: 'interior' as const, label: `🛋 ${t('design.interior')}` },
          { id: 'landscaping' as const, label: `🌿 ${t('design.landscaping')}` },
        ].map((tab) => (
          <button key={tab.id} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-white shadow text-brand-800' : 'text-gray-500'}`} onClick={() => { setActiveTab(tab.id); setSelectedIndex(0); }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Image gallery */}
      {currentImages.length > 0 ? (
        <div>
          <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-video relative">
            <img src={currentImages[selectedIndex]} alt="design render" className="w-full h-full object-cover" />
            <div className="absolute bottom-3 right-3">
              <button className="bg-brand-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow" onClick={() => { setStep(3); }}>
                ✓ Use This Design
              </button>
            </div>
          </div>
          {currentImages.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto scroll-hidden pb-1">
              {currentImages.map((url: string, i: number) => (
                <button key={i} onClick={() => setSelectedIndex(i)} className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${selectedIndex === i ? 'border-brand-800' : 'border-transparent'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 aspect-video flex items-center justify-center">
          <p className="text-gray-400 text-sm">No images for this tab</p>
        </div>
      )}

      {/* Iteration prompt */}
      <div className="card p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">💬 {t('design.iterate')}</p>
        <div className="flex gap-2">
          <input
            className="input-field flex-1 text-sm"
            placeholder={t('design.iteratePlaceholder')}
            value={iteratePrompt}
            onChange={(e) => setIteratePrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleIterate()}
          />
          <button className="btn-primary flex-shrink-0" onClick={handleIterate} disabled={!iteratePrompt.trim() || isIterating}>
            {isIterating ? '...' : '→'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">e.g. "Add a rooftop terrace", "Change roof to flat", "More glass on the front"</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← {t('common.back')}</button>
        <button className="btn-primary flex-1" onClick={() => setStep(3)}>
          {t('common.next')} → Structure
        </button>
      </div>
    </div>
  );
}
