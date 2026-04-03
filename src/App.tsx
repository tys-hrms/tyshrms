import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { RBACProvider, useRBAC } from './contexts/RBACContext';
import { CRMProvider } from './contexts/CRMContext';
import { PayrollProvider } from './contexts/PayrollContext';

import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
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
import ProfilePage from './pages/ProfilePage';
import CRMPage from './pages/CRMPage';
import PayrollPage from './pages/PayrollPage';

// Temporary loading splash
const LoadingSplash = ({ message = 'Initializing HRMSCore...' }: { message?: string }) => (
  <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
    <div className="w-16 h-16 border-4 border-custom-blue/20 border-t-custom-blue rounded-full animate-spin mb-4" />
    <p className="text-slate-400 font-medium animate-pulse">{message}</p>
  </div>
);

function AppRoutes() {
  const { session, isLoading: authLoading } = useAuth();
  const { isLoading: settingsLoading } = useSettings();
  const { isLoading: rbacLoading } = useRBAC();
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for the custom nav event from AppShell (Sidebar)
  useEffect(() => {
    const handleNav = (e: CustomEvent<string>) => {
      if (session.tenant?.companySlug) {
        navigate(`/${session.tenant.companySlug}/app${e.detail}`);
      } else {
        navigate(e.detail);
      }
    };
    window.addEventListener('nav-request' as any, handleNav);
    return () => window.removeEventListener('nav-request' as any, handleNav);
  }, [navigate, session.tenant]);

  if (authLoading) return <LoadingSplash message="Verifying Identity..." />;
  if (settingsLoading || rbacLoading) return <LoadingSplash message="Syncing System Settings..." />;

  // Auth & Discovery Logic
  if (location.pathname === '/register') return <RegistrationPage />;
  
  // If no tenant is selected, show login (discovery)
  if (!session.tenant) return <LoginPage />;
  
  // If tenant is selected but no user is logged in, show login (identity)
  if (!session.currentUser) return <LoginPage />;

  // Redirect root / to slug-based dashboard
  if (location.pathname === '/') {
    return <Navigate to={`/${session.tenant.companySlug}/app/`} replace />;
  }

  return (
    <Routes>
      <Route path="/:companySlug/app/*" element={
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
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      } />
      <Route path="*" element={<Navigate to={`/${session.tenant.companySlug}/app/`} replace />} />
    </Routes>
  );
}

import ThemeProvider from './components/ThemeProvider';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ThemeProvider>
          <RBACProvider>
            <CRMProvider>
              <PayrollProvider>
                <AppProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/*" element={<AppRoutes />} />
                    </Routes>
                  </BrowserRouter>
                </AppProvider>
              </PayrollProvider>
            </CRMProvider>
          </RBACProvider>
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
