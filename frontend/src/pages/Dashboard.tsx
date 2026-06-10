import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../stores/user.store';
import { useDesignStore } from '../stores/design.store';
import { designApi } from '../services/api.service';
import { toast } from '../components/ui/Toaster';

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const resetDesign = useDesignStore((s) => s.reset);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', country: '', city: '', currency: 'USD' });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: designApi.listProjects,
  });

  const createProject = useMutation({
    mutationFn: () => designApi.createProject(projectForm),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowNewProject(false);
      resetDesign();
      navigate(`/wizard/${project.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to create project'),
  });

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center text-white text-xs font-bold">H</div>
            <span className="font-bold text-brand-900 text-sm">House Design Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.name}</span>
            <span className={`badge ${user?.tier === 'PRO' ? 'bg-accent-500/10 text-accent-600' : 'bg-gray-100 text-gray-500'}`}>{user?.tier}</span>
            <button className="btn-ghost text-xs" onClick={() => { logout(); navigate('/'); }}>Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">My Designs</h1>
            <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn-primary gap-2" onClick={() => setShowNewProject(true)}>
            <span className="text-lg">+</span> New Project
          </button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-gray-200 animate-pulse" />)}
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏠</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No projects yet</h2>
            <p className="text-gray-500 mb-6">Start by creating your first house design project</p>
            <button className="btn-primary" onClick={() => setShowNewProject(true)}>Create First Project</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p: any) => (
            <div key={p.id} className="card-hover" onClick={() => navigate(`/wizard/${p.id}`)}>
              {p.houseDesign?.exteriorRenders?.[0] ? (
                <img src={p.houseDesign.exteriorRenders[0]} alt="render" className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-brand-800 to-brand-600 flex items-center justify-center">
                  <span className="text-4xl">🏡</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</h3>
                  <span className={`badge text-xs flex-shrink-0 ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                </div>
                {p.city && <p className="text-xs text-gray-400">📍 {p.city}{p.country ? `, ${p.country}` : ''}</p>}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">{new Date(p.updatedAt).toLocaleDateString()}</p>
                  {p.houseDesign?.style && <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{p.houseDesign.style.replace(/_/g, ' ')}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold mb-4">New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Project Name *</label>
                <input className="input-field" placeholder="e.g. My Family Home" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Country</label>
                  <input className="input-field" placeholder="e.g. Kenya" value={projectForm.country} onChange={(e) => setProjectForm({ ...projectForm, country: e.target.value })} />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input-field" placeholder="e.g. Nairobi" value={projectForm.city} onChange={(e) => setProjectForm({ ...projectForm, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input-field" value={projectForm.currency} onChange={(e) => setProjectForm({ ...projectForm, currency: e.target.value })}>
                  {['USD', 'EUR', 'GBP', 'KES', 'AED', 'ZAR', 'NGN', 'GHS', 'TZS', 'UGX'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-ghost flex-1" onClick={() => setShowNewProject(false)}>Cancel</button>
              <button className="btn-primary flex-1" disabled={!projectForm.name || createProject.isPending} onClick={() => createProject.mutate()}>
                {createProject.isPending ? 'Creating...' : 'Create & Design'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
