import React, { useState, useEffect, useMemo } from 'react';
import { Menu, LogOut, PackageSearch, Users, LayoutDashboard, Settings as SettingsIcon, CheckSquare, Calendar, ShieldCheck, CalendarOff, FileText, Cloud, CloudOff, Database, Bell, CheckCircle2, AlertCircle, Clock, X as CloseIcon } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC } from '../../contexts/RBACContext';
import { useApp } from '../../contexts/AppContext';
import WorkforceFAB from './WorkforceFAB';
import BreakLockScreen from './BreakLockScreen';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  activePath: string;
  onNavigate: (path: string) => void;
}

function Sidebar({ isOpen, setIsOpen, activePath, onNavigate }: SidebarProps) {
  const { session, logout } = useAuth();
  const { can } = useRBAC();
  const role = session.currentUser?.role || 'Worker';

  const navItems = [
    { id: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { id: '/assignments', label: 'My Tasks', icon: CheckSquare, module: 'assignments' },
    { id: '/users', label: 'Users', icon: Users, module: 'users' },
    { id: '/products', label: 'Products', icon: PackageSearch, module: 'products' },
    { id: '/attendance', label: 'Attendance', icon: Calendar, module: 'attendance' },
    { id: '/leaves', label: 'Leaves', icon: CalendarOff, module: 'leaves' },
    { id: '/reports', label: 'Reports', icon: FileText, module: 'reports' },
    { id: '/settings', label: 'Settings', icon: SettingsIcon, module: 'settings' },
    { id: '/rbac', label: 'Access Control', icon: ShieldCheck, module: 'rbac' },
  ] as const;

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
        <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center mr-3 font-bold text-xl">
            T
          </div>
          <span className="text-white font-semibold text-lg tracking-wide">TYS-HRMS</span>
        </div>

        {/* User Profile Mini */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="text-white font-medium truncate">{session.currentUser?.name}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            {role}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            // Check RBAC
            if (!can(role, item.module as any, 'view')) return null;

            const isActive = activePath === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-custom-blue/10 text-custom-blue' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-custom-blue' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
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

function TopHeader({ setIsSidebarOpen }: { setIsSidebarOpen: (v: boolean) => void }) {
  const { session } = useAuth();
  const { settings } = useSettings();
  const { notifications, markNotificationRead } = useApp();
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);

  const isCloudEnabled = settings.mongodb.isEnabled;
  const role = session.currentUser?.role || 'Worker';

  const myNotifications = notifications.filter(n => 
    n.userId === session.currentUser?.id || 
    (n.userId === 'broadcast_all' && (role === 'Admin' || role === 'Manager'))
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
           <h2 className="text-white font-semibold text-sm tracking-wide hidden lg:block opacity-50 uppercase">TYS Operations</h2>
        </div>
      </div>
      
      <div className="flex items-center space-x-3 md:space-x-6">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border bg-slate-900 border-slate-800">
           <div className={`w-1.5 h-1.5 rounded-full ${isCloudEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             {isCloudEnabled ? 'Cloud Sync Active' : 'Offline Storage'}
           </span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotiDropdown(!showNotiDropdown)}
            className={`p-2 rounded-xl border transition-all relative ${unreadCount > 0 ? 'bg-custom-blue/10 border-custom-blue/30 text-custom-blue' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotiDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notifications</h3>
                <button onClick={() => setShowNotiDropdown(false)} className="text-slate-500 hover:text-white"><CloseIcon className="w-4 h-4" /></button>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {myNotifications.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-sm italic">No notifications yet.</div>
                )}
                {myNotifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => { markNotificationRead(n.id); if (n.type === 'alert') setShowNotiDropdown(false); }}
                    className={`p-4 border-b border-white/[0.02] cursor-pointer hover:bg-white/[0.02] transition-colors relative ${!n.read ? 'bg-custom-blue/5' : ''}`}
                  >
                    {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-custom-blue" />}
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'alert' ? 'bg-rose-500/20 text-rose-500' : 'bg-custom-blue/20 text-custom-blue'}`}>
                        {n.type === 'alert' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase">{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-2">{new Date(n.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white leading-none">{session.currentUser?.name}</div>
            <div className="text-[10px] text-slate-500 font-black uppercase mt-1 leading-none opacity-60 tracking-wider">
              {session.currentUser?.role}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-custom-blue font-black shadow-inner">
            {session.currentUser?.name.charAt(0).toUpperCase()}
          </div>
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
  const w = users.find(u => u.id === currentLog.userId);
  const a = assignments.find(at => at.id === currentLog.assignmentId);

  return (
    <div className="h-10 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 fixed bottom-0 left-0 right-0 md:left-64 z-40 px-6 flex items-center overflow-hidden">
      <div className="flex items-center gap-2 mr-6 shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Operations Feed</span>
      </div>
      
      <div className="flex-1 overflow-hidden relative h-full">
        {activeLogs.map((log, i) => {
          const l_w = users.find(u => u.id === log.userId);
          const l_a = assignments.find(at => at.id === log.assignmentId);
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
                <span className="text-custom-blue uppercase">{l_a?.taskType || 'Task'}</span>
                <span className="mx-2 opacity-30">·</span>
                <span className="text-emerald-400">{log.piecesIroned || log.piecesChecked || log.piecesLabeled || log.piecesPacked || 0} units</span>
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
  
  const isCloudEnabled = settings.mongodb.isEnabled;
  const activePath = window.location.pathname;

  if (session.isOnBreak) {
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
        <TopHeader setIsSidebarOpen={setIsSidebarOpen} />

        {/* Page Content */}
        <main className="flex-1 pb-24 md:pb-6 relative overflow-x-hidden">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>

        <ScrollingTicker />
      </div>

      <WorkforceFAB />
    </div>
  );
}
