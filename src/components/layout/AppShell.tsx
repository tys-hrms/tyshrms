import React, { useState, useEffect, useMemo } from 'react';
import { Menu, LogOut, PackageSearch, Users, LayoutDashboard, Settings as SettingsIcon, CheckSquare, Calendar, ShieldCheck, CalendarOff, FileText, Cloud, CloudOff, Database, Bell, CheckCircle2, AlertCircle, Clock, X as CloseIcon, Building2, IndianRupee } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC } from '../../contexts/RBACContext';
import { useApp } from '../../contexts/AppContext';
import ActionCluster from './ActionCluster';
import BreakLockScreen from './BreakLockScreen';
import TicketNotificationHub from '../crm/TicketNotificationHub';
import NotificationCenter from './NotificationCenter';
import { useCRM } from '../../contexts/CRMContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  activePath: string;
  onNavigate: (path: string) => void;
}

function Sidebar({ isOpen, setIsOpen, activePath, onNavigate }: SidebarProps) {
  const { session, logout } = useAuth();
  const { can } = useRBAC();
  const { settings } = useSettings();
  const role = session.currentUser?.role || 'Worker';
  const { branding } = settings;

  const navGroups = [
    {
      title: 'Operations',
      items: [
        { id: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
        { id: '/assignments', label: 'My Tasks', icon: CheckSquare, module: 'assignments' },
        { id: '/products', label: 'Products', icon: PackageSearch, module: 'products' },
        { id: '/reports', label: 'Reports', icon: FileText, module: 'reports' }
      ]
    },
    {
      title: 'Workforce & HR',
      items: [
        { id: '/profile', label: 'My Personal Profile', icon: Users, module: 'dashboard' },
        { id: '/users', label: 'Organization Roster', icon: Users, module: 'users' },
        { id: '/attendance', label: 'Attendance Management', icon: Calendar, module: 'attendance' },
        { id: '/leaves', label: 'Leave Center', icon: CalendarOff, module: 'leaves' },
        { id: '/payroll', label: 'Payroll & Salaries', icon: IndianRupee, module: 'payroll' }
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: '/settings', label: 'System Settings', icon: SettingsIcon, module: 'settings' },
        { id: '/rbac', label: 'Access Control', icon: ShieldCheck, module: 'rbac' }
      ]
    },
    {
      title: 'CRM Module',
      items: [
        { id: '/crm', label: 'CRM Dashboard', icon: Building2, module: 'crm' }
      ]
    }
  ];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Operations': false,
    'Workforce & HR': false,
    'Administration': false,
    'CRM Module': false
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNav = (path: string) => {
    onNavigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand Area */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 bg-slate-950/20">
          <div className="w-8 h-8 rounded-lg bg-custom-blue/20 text-custom-blue flex items-center justify-center mr-3 font-bold text-xl overflow-hidden">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              branding.company_name.charAt(0)
            )}
          </div>
          <span className="text-white font-semibold text-lg tracking-wide truncate">{branding.company_name}</span>
        </div>

        {/* User Profile Mini */}
        <div className="p-6 border-b border-slate-800/50 bg-slate-900">
          <div className="text-white font-medium truncate">{session.currentUser?.name}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            {role}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-4">
          {navGroups.map((group) => {
            // Filter items by RBAC
            const visibleItems = group.items.filter(item => can(role, item.module as any, 'view'));
            if (visibleItems.length === 0) return null;

            const isExpanded = expandedGroups[group.title];

            return (
              <div key={group.title} className="px-3">
                <button 
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  {group.title}
                  <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </button>
                
                <div className={`mt-1 space-y-1 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {visibleItems.map((item) => {
                    const isActive = activePath === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                          isActive 
                            ? 'bg-custom-blue/10 text-custom-blue font-bold shadow-inner' 
                            : 'text-slate-400 font-medium hover:bg-slate-800/50 hover:text-slate-200'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-custom-blue' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function TopHeader({ setIsSidebarOpen, onOpenNotifications }: { setIsSidebarOpen: (v: boolean) => void, onOpenNotifications: () => void }) {
  const { session } = useAuth();
  const { settings } = useSettings();
  const { notifications, isSyncing: appSyncing } = useApp();
  const { isSyncing: settingsSyncing, lastSyncedAt } = useSettings();
  const { isSyncing: authSyncing } = useAuth();
  const { isSyncing: crmSyncing } = useCRM();

  const isAnySyncing = appSyncing || settingsSyncing || authSyncing || crmSyncing;

  const isCloudEnabled = !!settings.tenant_id;
  const role = session.currentUser?.role || 'Worker';
  const { branding } = settings;

  const myNotifications = notifications.filter(n => 
    n.user_id === session.currentUser?.id || 
    (n.user_id === 'broadcast_all' && (role === 'Admin' || role === 'Manager'))
  );
  const unreadCount = myNotifications.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-30">
      <div className="flex items-center">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 mr-2 text-slate-400 hover:text-white rounded-lg active:bg-slate-800 md:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden md:block">
           <h2 className="text-white font-semibold text-sm tracking-wide hidden lg:block opacity-50 uppercase">{branding.company_name} Operations</h2>
        </div>
      </div>
      
      <div className="flex items-center space-x-3 md:space-x-6">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border bg-slate-900 border-slate-800 transition-all duration-300">
           <div className={`w-1.5 h-1.5 rounded-full ${isAnySyncing ? 'bg-custom-blue animate-ping' : (isCloudEnabled ? 'bg-emerald-500' : 'bg-amber-500')}`} />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             {isAnySyncing ? (
               <>
                 <span className="text-custom-blue">Saving to Cloud...</span>
               </>
             ) : (
               <>
                 {isCloudEnabled ? 'Supabase Sync Active' : 'Local Mode'}
                 {lastSyncedAt && <span className="opacity-40 font-medium lowercase">({new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})</span>}
               </>
             )}
           </span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={onOpenNotifications}
            className={`p-2 rounded-xl border transition-all relative ${unreadCount > 0 ? 'bg-custom-blue/10 border-custom-blue/30 text-custom-blue' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 pulsing-red-shadow">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center space-x-3">
          <button onClick={() => window.dispatchEvent(new CustomEvent('nav-request', { detail: '/profile' }))} className="text-right hidden sm:block text-left group">
            <div className="text-xs font-bold text-white leading-none group-hover:text-custom-blue transition-colors">{session.currentUser?.name}</div>
            <div className="text-[10px] text-slate-500 font-black uppercase mt-1 leading-none opacity-60 tracking-wider">
              {session.currentUser?.role}
            </div>
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('nav-request', { detail: '/profile' }))} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-custom-blue font-black shadow-inner hover:bg-slate-800 transition-colors">
            {session.currentUser?.name.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
}


function ScrollingTicker() {
  const { workLogs, assignments } = useApp();
  const { users } = useAuth();
  const [index, setIndex] = useState(0);

  const activeLogs = useMemo(() => workLogs.slice(-10).reverse(), [workLogs]);

  useEffect(() => {
    if (activeLogs.length <= 1) return;
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % activeLogs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeLogs]);

  if (activeLogs.length === 0) return null;

  const currentLog = activeLogs[index];
  const w = users.find(u => u.id === currentLog.user_id);
  const a = assignments.find(at => at.id === currentLog.assignment_id);

  return (
    <div className="h-10 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 fixed bottom-0 left-0 right-0 md:left-64 z-40 px-6 flex items-center overflow-hidden">
      <div className="flex items-center gap-2 mr-6 shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Operations Feed</span>
      </div>
      
      <div className="flex-1 overflow-hidden relative h-full">
        {activeLogs.map((log, i) => {
          const l_w = users.find(u => u.id === log.user_id);
          const l_a = assignments.find(at => at.id === log.assignment_id);
          return (
            <div 
              key={log.id}
              className={`absolute inset-0 flex items-center transition-all duration-700 ${
                i === index ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
              }`}
            >
              <p className="text-[11px] font-bold text-slate-300 truncate tracking-wide">
                <span className="text-white">{l_w?.name || 'Worker'}</span>
                <span className="mx-2 opacity-30">·</span>
                <span className="text-custom-blue uppercase">{l_a?.task_type || 'Task'}</span>
                <span className="mx-2 opacity-30">·</span>
                <span className="text-emerald-400">{log.pieces_ironed || log.pieces_checked || log.pieces_labeled || log.pieces_packed || 0} units</span>
                <span className="mx-2 opacity-30">·</span>
                <span className="text-slate-500 font-medium">SKU {l_a?.sku}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4 border-l border-slate-800 pl-4">
         <span className="text-[10px] font-black text-slate-600">
           {index + 1} / {activeLogs.length}
         </span>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { session, endBreak } = useAuth();
  const { settings } = useSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const isCloudEnabled = !!settings.tenant_id;
  const activePath = window.location.pathname;
  const { branding } = settings;

  const { isSyncing: appSyncing } = useApp();
  const { isSyncing: settingsSyncing } = useSettings();
  const { isSyncing: authSyncing } = useAuth();
  const { isSyncing: crmSyncing } = useCRM();
  
  const isAnySyncing = appSyncing || settingsSyncing || authSyncing || crmSyncing;

  // --- Persistence Guard: Prevent closing tab during sync ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnySyncing) {
        e.preventDefault();
        e.returnValue = 'Data is currently being saved to the cloud. Are you sure you want to exit?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAnySyncing]);

  // --- Theme & Brand Engine ---
  useEffect(() => {
    const root = document.documentElement;
    
    // 1. Dark Mode Toggle
    if (branding.theme_mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. Custom Brand Colors Injection
    root.style.setProperty('--color-primary', branding.primary_color);
    root.style.setProperty('--color-secondary', branding.secondary_color);
    root.style.setProperty('--color-accent', branding.accent_color);
    
    // 3. Status Bar Color (Chrome/Safari)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', branding.theme_mode === 'dark' ? '#020617' : '#f8fafc');
  }, [branding]);

  if (session.is_on_break) {
    return <BreakLockScreen onEndBreak={endBreak} />;
  }

  const navigateTo = (path: string) => {
    window.dispatchEvent(new CustomEvent('nav-request', { detail: path }));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        activePath={activePath}
        onNavigate={navigateTo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <TopHeader setIsSidebarOpen={setIsSidebarOpen} onOpenNotifications={() => setIsNotificationsOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 pb-24 md:pb-6 relative overflow-x-hidden">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>

        <ScrollingTicker />
      </div>

      <ActionCluster />
      <TicketNotificationHub />
      <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  );
}
