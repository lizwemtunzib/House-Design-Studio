import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useUserStore } from '../stores/user.store';
import { authApi } from '../services/api.service';

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useUserStore((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', country: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = mode === 'login'
        ? await authApi.login(form.email, form.password)
        : await authApi.register(form);
      setAuth(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">H</div>
          <h1 className="font-display text-2xl font-bold text-white">House Design Studio</h1>
          <p className="text-blue-200 text-sm mt-1">{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
        </div>

        <div className="card p-6">
          <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-white shadow text-brand-800' : 'text-gray-500'}`} onClick={() => setMode(m)}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <input className="input-field" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input className="input-field" placeholder="e.g. Kenya, UAE, UK" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input-field pr-11" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 transition-colors hover:text-brand-700"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t('common.loading') : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200 text-xs mt-4">Free plan includes 1 project and AI design generation.</p>
        <button className="w-full text-center text-blue-200 text-sm mt-2 hover:text-white transition-colors" onClick={() => navigate('/')}>← Back to home</button>
      </div>
    </div>
  );
}
