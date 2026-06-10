import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDesignStore } from '../../stores/design.store';
import { boqApi, costApi } from '../../services/api.service';
import { toast } from '../../components/ui/Toaster';

const REGIONS = ['AFRICA', 'MIDDLE_EAST', 'EUROPE', 'USA', 'ASIA'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'AED', 'ZAR', 'NGN', 'GHS', 'TZS', 'UGX', 'SAR', 'EGP'];

export default function Step5Cost() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId, setStep, priceInputs, setPriceInput, setBulkPriceInputs, currency, setCurrency } = useDesignStore();
  const [costResult, setCostResult] = useState<any>(null);
  const [region, setRegion] = useState('AFRICA');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const { data: boq, isLoading: boqLoading } = useQuery({
    queryKey: ['boq', projectId],
    queryFn: () => boqApi.getBOQ(projectId!),
    enabled: !!projectId,
  });

  const calculateCost = useMutation({
    mutationFn: () => {
      const inputs = Object.values(priceInputs);
      return costApi.calculate(projectId!, inputs, currency);
    },
    onSuccess: (data) => {
      setCostResult(data);
      toast.success('Cost estimate calculated');
    },
    onError: () => toast.error('Cost calculation failed'),
  });

  const loadBenchmarks = useMutation({
    mutationFn: () => costApi.getBenchmarks(projectId!, region, currency),
    onSuccess: (data) => {
      if (!boq?.items) return;
      const inputs = boq.items.map((item: any) => {
        const matchKey = getBenchmarkKey(item.description, item.unit);
        const price = data.benchmarks[matchKey] ?? 0;
        return { boqItemId: item.id, unitPrice: price, labourRate: price * 0.3, currency };
      });
      setBulkPriceInputs(inputs);
      toast.info(`Loaded ${region} benchmark prices. Review and adjust before calculating.`);
    },
  });

  const items: any[] = boq?.items ?? [];
  const categories = [...new Set(items.map((i: any) => i.category))];

  if (boqLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-800 rounded-full" /></div>;

  return (
    <div className="space-y-5 pb-safe">
      {/* Currency & Benchmark */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">{t('cost.currency')}</label>
            <select className="input-field text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">{t('cost.region')}</label>
            <select className="input-field text-sm" value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-secondary w-full text-sm py-2" onClick={() => loadBenchmarks.mutate()} disabled={loadBenchmarks.isPending}>
          {loadBenchmarks.isPending ? 'Loading...' : `📊 ${t('cost.benchmark')}`}
        </button>
        <p className="text-xs text-gray-400">Benchmark prices are indicative. Always verify with local suppliers.</p>
      </div>

      {/* Cost result summary */}
      {costResult && (
        <div className="card p-4 bg-gradient-to-br from-brand-50 to-white">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-500">{t('cost.totalMaterials')}</p>
              <p className="text-xl font-bold text-gray-800">{currency} {costResult.totalMaterials.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('cost.totalLabour')}</p>
              <p className="text-xl font-bold text-gray-800">{currency} {costResult.totalLabour.toLocaleString()}</p>
            </div>
          </div>
          <div className="border-t border-brand-100 pt-3">
            <p className="text-xs text-gray-500 mb-0.5">{t('cost.totalCost')}</p>
            <p className="text-3xl font-display font-bold text-brand-800">{currency} {costResult.totalCost.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">{t('cost.costPerSqm')}: {currency} {costResult.costPerSqm.toLocaleString()}/m²</p>
          </div>
          <div className={`mt-3 text-xs px-2 py-1 rounded-full inline-block ${costResult.summary.estimateConfidence === 'HIGH' ? 'bg-green-100 text-green-700' : costResult.summary.estimateConfidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            {costResult.summary.estimateConfidence} confidence
          </div>
        </div>
      )}

      {/* Per-category price entry */}
      <div className="space-y-3">
        {categories.map((cat: string) => {
          const catItems = items.filter((i: any) => i.category === cat);
          const isOpen = editingCategory === cat;
          const catTotal = catItems.reduce((s: number, i: any) => {
            const p = priceInputs[i.id];
            return s + (p ? i.quantity * p.unitPrice : 0);
          }, 0);

          return (
            <div key={cat} className="card overflow-hidden">
              <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setEditingCategory(isOpen ? null : cat)}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{cat.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">({catItems.length} items)</span>
                </div>
                <div className="flex items-center gap-3">
                  {catTotal > 0 && <span className="text-sm font-medium text-brand-800">{currency} {catTotal.toLocaleString()}</span>}
                  <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {catItems.map((item: any) => (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs text-gray-700 flex-1 leading-tight">{item.description}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)} {item.unit}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1">{t('cost.unitPrice')} ({currency}/{item.unit})</p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input-field text-xs py-1.5 px-2"
                            value={priceInputs[item.id]?.unitPrice ?? ''}
                            onChange={(e) => setPriceInput(item.id, Number(e.target.value), priceInputs[item.id]?.labourRate)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1">{t('cost.labourRate')} (optional)</p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input-field text-xs py-1.5 px-2"
                            value={priceInputs[item.id]?.labourRate ?? ''}
                            onChange={(e) => setPriceInput(item.id, priceInputs[item.id]?.unitPrice ?? 0, Number(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {priceInputs[item.id]?.unitPrice > 0 && (
                        <p className="text-xs text-brand-600 mt-1.5 font-medium">
                          = {currency} {(item.quantity * (priceInputs[item.id]?.unitPrice ?? 0)).toLocaleString()} materials
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-700">{t('cost.disclaimer')}</p>
      </div>

      {/* Navigation */}
      <div className="space-y-2 pt-2">
        <button className="btn-primary w-full py-4 text-base" onClick={() => calculateCost.mutate()} disabled={calculateCost.isPending}>
          {calculateCost.isPending ? '⚙️ Calculating...' : '💰 Calculate Total Cost'}
        </button>
        {costResult && (
          <button className="btn-secondary w-full" onClick={() => navigate(`/export/${projectId}`)}>
            📄 Export Report →
          </button>
        )}
        <button className="btn-ghost w-full text-sm" onClick={() => setStep(4)}>← {t('common.back')}</button>
      </div>
    </div>
  );
}

function getBenchmarkKey(description: string, unit: string): string {
  const d = description.toLowerCase();
  if (d.includes('concrete')) return 'm³_concrete';
  if (d.includes('brick')) return 'nr_brick';
  if (d.includes('makiga') || d.includes('cseb')) return 'nr_makiga_block';
  if (d.includes('block')) return 'nr_block';
  if (d.includes('roof tile') || d.includes('roof cover')) return 'm²_roof_tile';
  if (d.includes('floor tile') || d.includes('ceramic')) return 'm²_floor_tile';
  if (d.includes('plaster')) return 'm²_plaster';
  if (d.includes('door')) return 'nr_door';
  if (d.includes('window')) return 'nr_window';
  if (d.includes('rebar') || d.includes('reinforcement') || d.includes(' kg')) return 'kg_rebar';
  if (d.includes('paint')) return 'm²_paint';
  if (d.includes('gutter')) return 'm_gutter';
  return '';
}
