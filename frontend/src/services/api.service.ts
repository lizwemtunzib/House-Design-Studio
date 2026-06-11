import axios, { AxiosError } from 'axios';
import { useUserStore } from '../stores/user.store';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
});

// Inject auth token
api.interceptors.request.use((config) => {
  const token = useUserStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const requestUrl = err.config?.url ?? '';
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
    if (err.response?.status === 401 && !isAuthRequest) {
      useUserStore.getState().logout();
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string; country?: string; preferredLang?: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// ── Designs / Projects ────────────────────────────────────────────────────────
export const designApi = {
  listProjects: () => api.get('/designs').then((r) => r.data),

  createProject: (data: { name: string; country?: string; city?: string; plotSize?: number; currency?: string }) =>
    api.post('/designs/projects', data).then((r) => r.data),

  getDesign: (projectId: string) => api.get(`/designs/${projectId}`).then((r) => r.data),

  generateDesign: (projectId: string, intent: object, imageFile?: File) => {
    const fd = new FormData();
    fd.append('intent', JSON.stringify(intent));
    if (imageFile) fd.append('referenceImage', imageFile);
    return api.post(`/designs/${projectId}/generate`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    }).then((r) => r.data);
  },

  iterateDesign: (projectId: string, prompt: string) =>
    api.post(`/designs/${projectId}/iterate`, { prompt }).then((r) => r.data),

  updateModel: (projectId: string, updates: object) =>
    api.patch(`/designs/${projectId}/model`, updates).then((r) => r.data),
};

// ── BOQ ───────────────────────────────────────────────────────────────────────
export const boqApi = {
  getBOQ: (projectId: string) => api.get(`/boq/${projectId}`).then((r) => r.data),
  recalculate: (projectId: string) => api.post(`/boq/${projectId}/recalculate`).then((r) => r.data),
};

// ── Cost ──────────────────────────────────────────────────────────────────────
export const costApi = {
  getCost: (projectId: string) => api.get(`/cost/${projectId}`).then((r) => r.data),
  calculate: (projectId: string, priceInputs: object[], currency: string) =>
    api.post(`/cost/${projectId}/calculate`, { priceInputs, currency }).then((r) => r.data),
  getBenchmarks: (projectId: string, region: string, currency: string) =>
    api.get(`/cost/${projectId}/benchmarks`, { params: { region, currency } }).then((r) => r.data),
};

// ── Export ────────────────────────────────────────────────────────────────────
export const exportApi = {
  exportPDF: (projectId: string) =>
    api.post(`/export/${projectId}/pdf`, {}, { responseType: 'blob', timeout: 30_000 }).then((r) => r.data),
  exportExcel: (projectId: string) =>
    api.post(`/export/${projectId}/excel`, {}, { responseType: 'blob', timeout: 30_000 }).then((r) => r.data),
  getHistory: (projectId: string) => api.get(`/export/${projectId}/history`).then((r) => r.data),
};

// ── Public ────────────────────────────────────────────────────────────────────
export const publicApi = {
  getBuildingSystems: () => api.get('/building-systems').then((r) => r.data),
  getDesignStyles: () => api.get('/design-styles').then((r) => r.data),
};

// Helper: download blob as file
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
