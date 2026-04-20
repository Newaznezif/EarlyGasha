import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './auth/Login';
import Register from './auth/Register';

// Lazy load heavy page components to optimize UI performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const FieldDashboard = lazy(() => import('./pages/FieldDashboard'));
const ResilienceToolkit = lazy(() => import('./pages/ResilienceToolkit'));
const CommunicationHub = lazy(() => import('./pages/CommunicationHub'));

// Skeleton loader fallback
const LoaderFallback = () => (
  <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center">
     <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
     <h2 className="font-bold tracking-widest uppercase text-[10px] text-slate-500">Decrypting Mainframe Hooks...</h2>
  </div>
);

const GlobalKeyBindings = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'D') navigate('/dashboard');
            if (e.key === 'A') navigate('/admin');
            if (e.key === 'F') navigate('/field');
            if (e.key === 'T') navigate('/toolkit');
            if (e.key === 'C') navigate('/comm');
            if (e.key === 'R') window.location.reload();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);
    return null;
};

export default function App() {
  return (
    <Router>
      <GlobalKeyBindings />
      <Suspense fallback={<LoaderFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            {/* Real-Time Intelligence Dashboard (The Map) */}
            <Route element={<ProtectedRoute requiredRole={['institutional_user', 'community_user', 'system_admin', 'field_officer']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            
            {/* Field Officer Landing */}
            <Route element={<ProtectedRoute requiredRole="field_officer" />}>
              <Route path="/field" element={<FieldDashboard />} />
            </Route>

            <Route element={<ProtectedRoute requiredRole="system_admin" />}>
               <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Resilience & Preparedness Toolkit */}
            <Route element={<ProtectedRoute requiredRole={['institutional_user', 'system_admin', 'field_officer']} />}>
               <Route path="/toolkit" element={<ResilienceToolkit />} />
            </Route>

            {/* Crisis Communication Hub */}
            <Route element={<ProtectedRoute requiredRole={['institutional_user', 'system_admin', 'field_officer']} />}>
               <Route path="/comm" element={<CommunicationHub />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
