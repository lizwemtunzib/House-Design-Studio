import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDesignStore, WizardStep } from '../../stores/design.store';
import Step1Input from './Step1Input';
import Step2Design from './Step2Design';
import Step3Structure from './Step3Structure';
import Step4BOQ from './Step4BOQ';
import Step5Cost from './Step5Cost';

const STEPS: { num: WizardStep; key: string }[] = [
  { num: 1, key: 'steps.1' },
  { num: 2, key: 'steps.2' },
  { num: 3, key: 'steps.3' },
  { num: 4, key: 'steps.4' },
  { num: 5, key: 'steps.5' },
];

export default function WizardLayout() {
  const { t } = useTranslation();
  const { projectId: urlProjectId } = useParams();
  const navigate = useNavigate();
  const { currentStep, projectId, setProjectId } = useDesignStore();

  useEffect(() => {
    if (urlProjectId && urlProjectId !== projectId) {
      setProjectId(urlProjectId);
    }
  }, [urlProjectId, projectId, setProjectId]);

  const STEP_COMPONENTS = {
    1: <Step1Input />,
    2: <Step2Design />,
    3: <Step3Structure />,
    4: <Step4BOQ />,
    5: <Step5Cost />,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top Nav ──────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <button className="btn-ghost text-sm py-2 gap-1.5" onClick={() => navigate('/dashboard')}>
              ← <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center text-white text-xs font-bold">H</div>
            <div className="w-16" /> {/* spacer */}
          </div>

          {/* Step progress bar */}
          <div className="pb-3 overflow-x-auto scroll-hidden">
            <div className="flex gap-1 min-w-[400px]">
              {STEPS.map((s) => {
                const isCompleted = currentStep > s.num;
                const isActive = currentStep === s.num;
                return (
                  <button
                    key={s.num}
                    onClick={() => isCompleted && useDesignStore.getState().setStep(s.num)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${isActive ? 'bg-brand-50' : ''} ${isCompleted ? 'cursor-pointer' : 'cursor-default'}`}
                    disabled={!isCompleted}
                  >
                    <div className={`step-indicator text-xs w-7 h-7 ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-brand-800 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {isCompleted ? '✓' : s.num}
                    </div>
                    <span className={`text-[10px] font-medium leading-tight text-center hidden sm:block ${isActive ? 'text-brand-800' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      {t(`${s.key}.title`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* ── Step Content ──────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <div className="mb-6">
          <h1 className="section-title">{t(`steps.${currentStep}.title` as any)}</h1>
          <p className="text-gray-500 text-sm mt-1">{t(`steps.${currentStep}.subtitle` as any)}</p>
        </div>
        {STEP_COMPONENTS[currentStep]}
      </main>
    </div>
  );
}
