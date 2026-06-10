import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { designApi, exportApi, downloadBlob } from '../services/api.service';
import { toast } from '../components/ui/Toaster';

export default function ExportPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ['design', projectId],
    queryFn: () => designApi.getDesign(projectId!),
    enabled: !!projectId,
  });

  const { data: exportHistory } = useQuery({
    queryKey: ['export-history', projectId],
    queryFn: () => exportApi.getHistory(projectId!),
    enabled: !!projectId,
  });

  const handleDownload = async (type: 'pdf' | 'excel') => {
    if (!projectId) return;
    setDownloading(type);
    try {
      const blob = type === 'pdf' ? await exportApi.exportPDF(projectId) : await exportApi.exportExcel(projectId);
      const ext = type === 'pdf' ? 'pdf' : 'xlsx';
      const name = `BOQ_${project?.name ?? 'Design'}_${new Date().toISOString().slice(0, 10)}.${ext}`;
      downloadBlob(blob, name);
      toast.success(`${type.toUpperCase()} downloaded successfully`);
    } catch {
      toast.error(`Failed to generate ${type.toUpperCase()}. Please try again.`);
    } finally {
      setDownloading(null);
    }
  };

  const model = project?.houseDesign?.houseModel;
  const boq = model?.boq;
  const cost = boq?.costEstimate;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button className="btn-ghost text-sm py-2" onClick={() => navigate(`/wizard/${projectId}`)}>← Back to Design</button>
          <span className="font-semibold text-gray-800 text-sm">Export</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="section-title">{t('export.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{project?.name}</p>
        </div>

        {/* Project summary */}
        {model && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Project Summary</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Floor Area', `${model.totalFloorArea?.toFixed(0)} m²`],
                ['Floors', model.numberOfFloors],
                ['Wall System', model.wallSystem?.replace(/_/g, ' ')],
                ['Roof Type', model.roofType?.replace(/_/g, ' ')],
                ['Foundation', model.foundationType],
                ['Total BOQ Items', boq?.items?.length ?? '—'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="font-medium text-gray-800">{v}</p>
                </div>
              ))}
            </div>
            {cost && cost.totalCost > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">Total Estimated Cost</p>
                <p className="text-2xl font-display font-bold text-brand-800">{project?.currency} {cost.totalCost.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{project?.currency} {cost.costPerSqm?.toLocaleString()}/m²</p>
              </div>
            )}
          </div>
        )}

        {/* Download options */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Download Files</h2>

          <button className="card-hover w-full flex items-center gap-4 p-4" onClick={() => handleDownload('pdf')} disabled={downloading === 'pdf'}>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl flex-shrink-0">📄</div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800">{t('export.pdfReport')}</p>
              <p className="text-xs text-gray-500 mt-0.5">Full BOQ with quantities, warnings and assumptions</p>
            </div>
            {downloading === 'pdf' ? (
              <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-800 rounded-full animate-spin" />
            ) : (
              <span className="text-gray-400">↓</span>
            )}
          </button>

          <button className="card-hover w-full flex items-center gap-4 p-4" onClick={() => handleDownload('excel')} disabled={downloading === 'excel'}>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">📊</div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800">{t('export.excelWorkbook')}</p>
              <p className="text-xs text-gray-500 mt-0.5">Multi-sheet workbook: Summary, BOQ, Cost Breakdown, Model Data</p>
            </div>
            {downloading === 'excel' ? (
              <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-800 rounded-full animate-spin" />
            ) : (
              <span className="text-gray-400">↓</span>
            )}
          </button>
        </div>

        {/* Renders gallery */}
        {project?.houseDesign?.exteriorRenders?.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">Design Renders</h2>
            <div className="grid grid-cols-3 gap-2">
              {project.houseDesign.exteriorRenders.map((url: string, i: number) => (
                <a key={i} href={url} download={`render_${i + 1}.jpg`} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Render ${i + 1}`} className="w-full aspect-video object-cover rounded-xl hover:opacity-90 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Export history */}
        {exportHistory?.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">Export History</h2>
            <div className="space-y-1.5">
              {exportHistory.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span>{e.format === 'PDF' ? '📄' : '📊'}</span>
                    <span className="text-sm text-gray-700">{e.fileName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">{e.fileSizeKb} KB</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-700 font-medium mb-1">⚠ Important Notice</p>
          <p className="text-xs text-amber-600">{t('export.disclaimer')}</p>
        </div>
      </main>
    </div>
  );
}
