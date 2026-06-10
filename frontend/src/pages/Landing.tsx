import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../stores/user.store';
import { SUPPORTED_LANGUAGES } from '../i18n';
import i18n from '../i18n';

const FEATURES = [
  { icon: '🏗', title: 'AI House Design', desc: 'Generate stunning exterior renders, interior concepts and landscaping from a text description or photo.' },
  { icon: '📐', title: 'Smart Floor Plans', desc: 'Interactive floor plan editor with drag-and-drop rooms. Supports 8 construction systems globally.' },
  { icon: '📋', title: 'Deterministic BOQ', desc: 'Rule-based Bill of Quantities engine. 100% reproducible calculations — no AI guessing for quantities.' },
  { icon: '💰', title: 'Cost Estimation', desc: 'Enter your local unit prices. Get instant materials + labour breakdown with cost per m².' },
  { icon: '📄', title: 'Professional Exports', desc: 'Export contractor-ready PDF reports and Excel workbooks with one click.' },
  { icon: '🌍', title: 'Global Systems', desc: 'Supports brick, block, timber frame, steel, glass curtain wall, Makiga CSEB, SIP and precast systems.' },
];

const SYSTEMS = [
  { name: 'Brick Masonry', icon: '🧱', region: 'Global' },
  { name: 'Concrete Block', icon: '🏗', region: 'Global' },
  { name: 'Makiga CSEB', icon: '🌍', region: 'Africa' },
  { name: 'Timber Frame', icon: '🪵', region: 'Europe/USA' },
  { name: 'Light Steel Frame', icon: '⚙️', region: 'Global' },
  { name: 'Glass Curtain Wall', icon: '🪟', region: 'Global' },
  { name: 'SIP Panels', icon: '🏠', region: 'Europe/USA' },
  { name: 'Precast Panels', icon: '🏭', region: 'Global' },
  { name: 'Interlocking Blocks', icon: '🔲', region: 'Africa/Asia' },
];

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center text-white text-sm font-bold">H</div>
            <span className="font-bold text-brand-900 text-sm">House Design Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="text-xs text-gray-500 bg-transparent border-0 cursor-pointer focus:outline-none"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            {user ? (
              <button className="btn-primary py-2 text-xs" onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</button>
            ) : (
              <>
                <button className="btn-ghost py-2 text-xs hidden sm:flex" onClick={() => navigate('/auth')}>{t('nav.login')}</button>
                <button className="btn-primary py-2 text-xs" onClick={() => navigate('/auth')}>{t('nav.getStarted')}</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute border border-white/20 rounded-lg"
              style={{ width: 60 + (i * 30) % 120, height: 40 + (i * 20) % 80, top: `${(i * 13) % 80}%`, left: `${(i * 17) % 90}%`, transform: 'rotate(-15deg)' }} />
          ))}
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI-Powered for Africa, Middle East, Europe, USA & Asia
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold mb-6 text-balance leading-tight">
            Design. Plan. Build.<br />
            <span className="text-accent-500">Any House. Anywhere.</span>
          </h1>
          <p className="text-blue-100 text-lg sm:text-xl max-w-2xl mx-auto mb-10 text-balance">
            Describe your dream home in any language. Our AI generates the design,
            your floor plan, full BOQ and cost estimate — in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="btn-primary bg-accent-500 hover:bg-accent-600 text-white px-8 py-4 text-base" onClick={() => navigate('/auth')}>
              🏠 Start Designing Free
            </button>
            <button className="btn-secondary border-white/30 text-white hover:bg-white/10 px-8 py-4 text-base" onClick={() => navigate('/auth')}>
              📋 View Sample BOQ
            </button>
          </div>
          <p className="text-blue-200 text-xs mt-4">No credit card required · 1 free project</p>
        </div>

        {/* Mock house mockup */}
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl">
            <div className="bg-white/10 px-4 py-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/60" /><div className="w-3 h-3 rounded-full bg-yellow-400/60" /><div className="w-3 h-3 rounded-full bg-green-400/60" />
              <span className="text-white/40 text-xs ml-2">House Design Studio — Step 2: AI Design</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4 min-h-[140px]">
              {['Exterior Render', 'Interior Concept', 'Floor Plan'].map((label) => (
                <div key={label} className="rounded-xl bg-white/5 flex items-center justify-center p-4 text-center">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-white/10 mx-auto mb-2 flex items-center justify-center text-xl">
                      {label === 'Exterior Render' ? '🏡' : label === 'Interior Concept' ? '🛋' : '📐'}
                    </div>
                    <p className="text-white/60 text-xs">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="section-title text-center mb-2">Everything you need to plan your build</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">From inspiration to contractor-ready documents — all in one tool.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Construction Systems ──────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="section-title text-center mb-2">Built for your construction method</h2>
          <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">From traditional brick in Africa to glass curtain walls in the Middle East — fully supported.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {SYSTEMS.map((s) => (
              <div key={s.name} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.region}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="py-16 bg-brand-900 text-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-2">Simple pricing</h2>
          <p className="text-blue-200 text-center mb-10">Start free. Upgrade when you need more.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { name: 'Free', price: '$0', period: '', features: ['1 project', 'AI design generation', 'Basic BOQ', 'PDF export'], cta: 'Start Free', primary: false },
              { name: 'Pro', price: '$9.99', period: '/month', features: ['Unlimited projects', 'Full BOQ + Cost engine', 'Excel & PDF export', 'All 9 building systems', 'Priority support'], cta: 'Get Pro', primary: true },
              { name: 'Enterprise', price: '$29.99', period: '/month', features: ['Everything in Pro', 'API access', 'Multi-user workspace', 'White-label options', 'Dedicated support'], cta: 'Contact Us', primary: false },
            ].map((tier) => (
              <div key={tier.name} className={`rounded-2xl p-6 ${tier.primary ? 'bg-accent-500 text-white scale-[1.03]' : 'bg-white/10 text-white'}`}>
                <p className="font-bold text-lg mb-1">{tier.name}</p>
                <p className="text-3xl font-display font-bold mb-0.5">{tier.price}<span className="text-sm font-normal opacity-70">{tier.period}</span></p>
                <ul className="mt-4 space-y-2 mb-6">
                  {tier.features.map((f) => <li key={f} className="flex items-center gap-2 text-sm opacity-90"><span>✓</span>{f}</li>)}
                </ul>
                <button className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${tier.primary ? 'bg-white text-accent-600 hover:bg-gray-50' : 'bg-white/20 hover:bg-white/30'}`} onClick={() => navigate('/auth')}>
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">© 2026 House Design Studio. For planning purposes only.</p>
          <p className="text-gray-300 text-xs">⚠ This tool does not provide certified engineering or legal approval.</p>
        </div>
      </footer>
    </div>
  );
}
