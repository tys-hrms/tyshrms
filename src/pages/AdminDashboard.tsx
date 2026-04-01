import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  CheckCircle2, Clock, Users, Package, TrendingUp, AlertCircle, 
  Shirt, Search, Tag, Box, MessageSquare, ShieldAlert, CheckSquare,
  Printer
} from 'lucide-react';

export default function AdminDashboard() {
  const { session, users } = useAuth();
  const { getDailyStats, notifications, markNotificationRead } = useApp();
  const { settings } = useSettings();
  
  const today = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => getDailyStats(today), [getDailyStats, today]);
  const urgentAlerts = notifications.filter(n => n.type === 'alert' && !n.read);

  const handlePrint = () => {
    window.print();
  };
  
  const cards = [
    { label: 'Total Pieces Assigned', value: stats.totalPiecesAssigned, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Pieces Completed', value: stats.totalPiecesCompleted, icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Pending / Carried', value: stats.totalPiecesPending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Defects / Rejected', value: stats.totalRejected, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Active Workers', value: stats.activeWorkers, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Workers on Leave', value: stats.onLeave, icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  const taskBreakdown = [
    { label: 'Ironed', value: stats.totalIroned, icon: Shirt, color: 'text-pink-400' },
    { label: 'Checked', value: stats.totalChecked, icon: Search, color: 'text-indigo-400' },
    { label: 'Labeled', value: stats.totalLabeled, icon: Tag, color: 'text-green-400' },
    { label: 'Packed', value: stats.totalPacked, icon: Box, color: 'text-emerald-400' },
  ];

  const progress = stats.totalPiecesAssigned > 0 
    ? Math.round((stats.totalPiecesCompleted / stats.totalPiecesAssigned) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {session.currentUser?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
        >
          <Printer className="w-4 h-4" />
          Print Summary
        </button>
      </div>

      {/* Print Header (Visible only when printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-2xl font-black text-slate-900">{settings.branding.companyName}</h1>
                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Daily Operations Summary</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase">Generated On</p>
                <p className="text-sm font-black text-slate-900">{new Date().toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${c.bg}`}>
                  <Icon className={`w-6 h-6 ${c.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-slate-600" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-white">{c.value}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Support Queue / Urgent Alerts */}
        <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-6 flex flex-col shadow-2xl shadow-rose-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Support Queue
            </h3>
            {urgentAlerts.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
                {urgentAlerts.length} ACTIVE
              </span>
            )}
          </div>

          <div className="flex-1 space-y-4 relative z-10 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {urgentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 text-center">
                <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-40">All clear</p>
                <p className="text-xs mt-1">No active support requests</p>
              </div>
            ) : (
              urgentAlerts.map(alert => {
                const sender = users.find(u => u.id === alert.senderId);
                return (
                  <div key={alert.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-500/40 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded">Urgent Help</span>
                       <span className="text-[10px] font-bold text-slate-600 uppercase">{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">{sender?.name || 'Worker'} signaled help</p>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">{alert.message}</p>
                    <button 
                      onClick={() => markNotificationRead(alert.id)}
                      className="w-full py-2 bg-slate-800 hover:bg-emerald-500 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Resolve / Acknowledge
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-6">Today's Progress</h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Total Assignments (Included Carried)</span>
            <span className="text-sm font-bold text-white">{progress}% Complete</span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-custom-blue to-teal-400 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
            {taskBreakdown.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center p-2 bg-slate-800 rounded-lg mb-2">
                    <Icon className={`w-5 h-5 ${t.color}`} />
                  </div>
                  <p className="text-xl font-bold text-white">{t.value}</p>
                  <p className="text-xs font-medium text-slate-500 uppercase">{t.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Action Items</h2>
          {stats.totalPiecesPending > 0 ? (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <div className="flex items-center text-orange-400 mb-2">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Pending Work</span>
              </div>
              <p className="text-sm text-slate-300">
                You have {stats.totalPiecesPending} pieces pending to be completed today across all active workers.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl">
              <div className="flex items-center text-teal-400 mb-2">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span className="font-semibold">All Caught Up</span>
              </div>
              <p className="text-sm text-slate-300">
                No pending pieces for today.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
