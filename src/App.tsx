import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { RBACProvider } from './contexts/RBACContext';

import LoginPage from './pages/LoginPage';
import FirstRunPage from './pages/FirstRunPage';
import AppShell from './components/layout/AppShell';

// Placeholder Pages for V2
import AdminDashboard from './pages/AdminDashboard';
import UsersPage from './pages/UsersPage';
import AssignmentsPage from './pages/AssignmentsPage';
import SettingsPage from './pages/SettingsPage';
import RBACPage from './pages/RBACPage';
import AttendanceIndex from './pages/AttendanceIndex';
import ProductsPage from './pages/ProductsPage';
import LeaveManagement from './pages/attendance/LeaveManagement';
import ReportsPage from './pages/ReportsPage';

// Temporary placeholders until we build them in the next steps
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex h-[50vh] flex-col items-center justify-center text-slate-400">
    <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
    <p>This module is under construction</p>
  </div>
);

function AppRoutes() {
  const { session, isFirstRun } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for the custom nav event from AppShell (Sidebar)
  useEffect(() => {
    const handleNav = (e: CustomEvent<string>) => {
      navigate(e.detail);
    };
    window.addEventListener('nav-request' as any, handleNav);
    return () => window.removeEventListener('nav-request' as any, handleNav);
  }, [navigate]);

  if (isFirstRun) return <FirstRunPage />;
  if (!session.currentUser) return <LoginPage />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/attendance" element={<AttendanceIndex />} />
        <Route path="/leaves" element={<LeaveManagement />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/rbac" element={<RBACPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <RBACProvider>
        <AuthProvider>
          <AppProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/*" element={<AppRoutes />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </AuthProvider>
      </RBACProvider>
    </SettingsProvider>
  );
}
