import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useUserStore } from './stores/user.store';
import { Toaster } from './components/ui/Toaster';
import { FullScreenLoader } from './components/ui/FullScreenLoader';

// Lazy-loaded pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WizardLayout = lazy(() => import('./pages/wizard/WizardLayout'));
const ExportPage = lazy(() => import('./pages/Export'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useUserStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/wizard/:projectId?" element={<PrivateRoute><WizardLayout /></PrivateRoute>} />
          <Route path="/export/:projectId" element={<PrivateRoute><ExportPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
