import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDesignStore, BOQItem } from '../../stores/design.store';
import { boqApi } from '../../services/api.service';
import { BOQTable } from '../../components/BOQTable';

interface BOQResponse {
  items?: BOQItem[];
  summary?: { totalItems?: number };
  wallSystemUsed?: string;
  warnings?: string[];
  assumptions?: string[];
}

const CATEGORY_ICONS: Record<string, string> = {
  PRELIMINARY: '📋', EXCAVATION: '⛏', SUBSTRUCTURE: '🏗',
  SUPERSTRUCTURE: '🧱', ROOFING: '🏠', WINDOWS_DOORS: '🪟',
  INTERNAL_FINISHES: '🎨', EXTERNAL_FINISHES: '🖌', GLASS_SYSTEMS: '🔲',
  PLUMBING_SANITARYWARE: '🚿', ELECTRICAL_CONDUITS: '⚡',
  EXTERNAL_WORKS: '🌳', LANDSCAPING: '🌺',
};

export default function Step4BOQ() {
  const { t } = useTranslation();
  const { projectId, setStep, setBOQItems } = useDesignStore();
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: boq, isLoading } = useQuery<BOQResponse>({
    queryKey: ['boq', projectId],
    queryFn: () => boqApi.getBOQ(projectId!),
    enabled: !!projectId,
    onSuccess: (data: BOQResponse) => setBOQItems(data.items ?? []),
  } as any);

  const items: any[] = boq?.items ?? [];
  const categories = ['ALL', ...new Set(items.map((i) => i.category))];

  const filteredItems = items.filter((i) => {
    const catMatch = filterCategory === 'ALL' || i.category === filterCategory;
    const searchMatch = !search || i.description.toLowerCase().includes(search.toLowerCase()) || i.subCategory?.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const groupedItems = filteredItems.reduce((acc: Record<string, any[]>, item) => {
    acc[item.category] = acc[item.category] ?? [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-800 rounded-full" /></div>;

  if (!boq) return (
    <div className="text-center py-12">
      <p className="text-gray-500">No BOQ found. Go back to Structure and generate the BOQ.</p>
      <button className="btn-secondary mt-4" onClick={() => setStep(3)}>← Back to Structure</button>
    </div>
  );

  return (
    <div className="space-y-5 pb-safe">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-brand-800">{boq.summary?.totalItems ?? items.length}</p>
          <p className="text-xs text-gray-500">{t('boq.items')}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-sm font-bold text-brand-800 truncate">{boq.wallSystemUsed?.replace(/_/g, ' ')}</p>
          <p className="text-xs text-gray-500">Wall System</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{Object.keys(groupedItems).length}</p>
          <p className="text-xs text-gray-500">Categories</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-700">{t('boq.disclaimer')}</p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <input className="input-field text-sm" placeholder="🔍 Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1.5 overflow-x-auto scroll-hidden pb-1">
          {categories.map((cat) => (
            <button key={cat} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCategory === cat ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setFilterCategory(cat)}>
              {cat !== 'ALL' && <span>{CATEGORY_ICONS[cat] ?? '📦'}</span>}
              {cat === 'ALL' ? 'All' : cat.replace(/_/g, ' ')}
              {cat !== 'ALL' && <span className="bg-white/20 px-1 rounded">{items.filter((i) => i.category === cat).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {(boq.warnings?.length ?? 0) > 0 && (
        <div className="space-y-1.5">
          {boq.warnings.map((w: string, i: number) => (
            <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
              <span className="text-red-500 text-sm flex-shrink-0">⚠</span>
              <p className="text-xs text-red-700">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* BOQ table */}
      <BOQTable groupedItems={groupedItems} categoryIcons={CATEGORY_ICONS} />

      {/* Assumptions */}
      {(boq.assumptions?.length ?? 0) > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Calculation Assumptions</p>
          <ul className="space-y-1">
            {boq.assumptions.map((a: string, i: number) => (
              <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5"><span>•</span>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1" onClick={() => setStep(3)}>← {t('common.back')}</button>
        <button className="btn-primary flex-1" onClick={() => setStep(5)}>💰 Add Costs →</button>
      </div>
    </div>
  );
}
