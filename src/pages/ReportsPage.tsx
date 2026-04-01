import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  BarChart3, Users, Package, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownRight, Download, Filter,
  CheckCircle2, AlertCircle, Clock, User as UserIcon
} from 'lucide-react';

export default function ReportsPage() {
  const { assignments, workLogs, getDailyStats } = useApp();
  const { users, attendanceLogs } = useAuth();
  const { settings } = useSettings();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  const stats = useMemo(() => getDailyStats(), [getDailyStats]);

  // --- Dynamic Quality Rate Calculation ---
  const qualityRate = useMemo(() => {
    const totalProcessed = stats.totalPiecesCompleted + stats.totalRejected;
    if (totalProcessed === 0) return '0%';
    return `${Math.round((stats.totalPiecesCompleted / totalProcessed) * 100)}%`;
  }, [stats]);

  const handlePrint = () => {
    window.print();
  };

  // --- Process Production Data ---
  const productionBySKU = useMemo(() => {
    const counts: Record<string, { completed: number; target: number }> = {};
    assignments.forEach(a => {
      if (!counts[a.sku]) counts[a.sku] = { completed: 0, target: 0 };
      counts[a.sku].completed += a.piecesCompleted;
      counts[a.sku].target += (a.targetQty || a.piecesAssigned);
    });
    return Object.entries(counts).map(([sku, data]) => ({
      sku,
      ...data,
      percent: Math.round((data.completed / (data.target || 1)) * 100)
    })).sort((a, b) => b.completed - a.completed).slice(0, 5);
  }, [assignments]);

  // --- Process Worker Leaderboard ---
  const topWorkers = useMemo(() => {
    const performance: Record<string, number> = {};
    workLogs.forEach(log => {
      const pieces = (log.piecesIroned || 0) + (log.piecesChecked || 0) + (log.piecesPacked || 0);
      performance[log.userId] = (performance[log.userId] || 0) + pieces;
    });

    return Object.entries(performance)
      .map(([id, total]) => ({
        id,
        name: users.find(u => u.id === id)?.name || 'Unknown',
        total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [workLogs, users]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Intelligence Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time operational analytics for workforce productivity and inventory flow.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
            {(['today', 'week', 'month'] as const).map(r => (
              <button 
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${timeRange === r ? 'bg-custom-blue text-white shadow-lg shadow-custom-blue/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            Print to A4
          </button>
        </div>
      </div>

      {/* Print Header (Visible only when printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-2xl font-black">{settings.branding.companyName}</h1>
                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Intelligence Operational Report</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase">Generated On</p>
                <p className="text-sm font-black">{new Date().toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <StatCard label="Total Attendance" value={stats.activeWorkers} sub="Workers Active" icon={Users} color="blue" trend="+2.4%" />
        <StatCard label="Units Produced" value={stats.totalPiecesCompleted} sub="Pieces Finished" icon={Package} color="emerald" trend="+12.5%" />
        <StatCard label="Quality Rate" value={qualityRate} sub="Checks Passed" icon={TrendingUp} color="amber" trend="+0.8%" />
        <StatCard label="Efficiency" value={`${Math.round((stats.totalPiecesCompleted / (stats.totalPiecesAssigned || 1)) * 100)}%`} sub="Target Achievement" icon={BarChart3} color="purple" trend="-1.2%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-3">
        {/* Production Breakdown */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 print:border-slate-200 print:bg-white print:p-0">
          <div className="flex items-center justify-between mb-8 print:mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 print:text-slate-900">
              <Package className="w-5 h-5 text-custom-blue" />
              Production by SKU
            </h3>
          </div>
          
          <div className="space-y-6 print:space-y-4">
            {productionBySKU.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-sm font-bold text-white uppercase tracking-wider print:text-slate-900">{item.sku}</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{item.completed.toLocaleString()} / {item.target.toLocaleString()} Units</p>
                  </div>
                  <span className="text-sm font-black text-white print:text-slate-900">{item.percent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden print:bg-slate-100">
                  <div 
                    className="h-full bg-gradient-to-r from-custom-blue to-blue-400 transition-all duration-1000 print:bg-slate-900"
                    style={{ width: `${Math.min(100, item.percent)}%` }}
                  />
                </div>
              </div>
            ))}
            {productionBySKU.length === 0 && (
               <div className="py-12 text-center text-slate-600 font-medium">No production data recorded yet.</div>
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 print:border-slate-200 print:bg-white print:p-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-8 print:mb-4 print:text-slate-900">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Top Performers
          </h3>
          <div className="space-y-5 print:space-y-3">
            {topWorkers.map((w, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 print:border-slate-100 print:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sm font-black text-white print:bg-slate-200 print:text-slate-700">
                    {w.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white print:text-slate-900">{w.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Rank #{i+1}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-400 print:text-slate-900">{w.total.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pieces</p>
                </div>
              </div>
            ))}
            {topWorkers.length === 0 && (
              <div className="py-12 text-center text-slate-600 font-medium italic">Leaderboard pending...</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 print:border-slate-200 print:bg-white print:p-0 print:border-t-2 print:mt-12">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-8 print:mb-4 print:text-slate-900">
          <Clock className="w-5 h-5 text-slate-400" />
          Recent Activity Summary
        </h3>
        <div className="space-y-4 print:space-y-2">
           {workLogs.slice(-8).reverse().map((log, i) => (
             <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-transparent print:border-b print:border-slate-100 print:rounded-none px-0">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 print:hidden">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 print:text-slate-700">
                    <span className="font-bold text-white print:text-slate-900">{users.find(u => u.id === log.userId)?.name}</span> 
                    {" logged "}
                    <span className="text-emerald-400 font-bold print:text-slate-900">{(log.piecesIroned || 0) + (log.piecesChecked || 0) + (log.piecesPacked || 0)} pieces</span>
                    {" for SKU "}
                    <span className="font-bold text-white tracking-wider print:text-slate-900">{assignments.find(a => a.id === log.assignmentId)?.sku || 'Unknown'}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{new Date(log.loggedAt).toLocaleString()}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, trend, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all print:border-slate-200 print:bg-slate-50 print:p-4">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${colorMap[color].split(' ')[1]} opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10 print:mb-2">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]} print:hidden`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'} print:hidden`}>
          {trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</h4>
        <div className="text-3xl font-black text-white mt-1 print:text-slate-900 print:text-xl">{value}</div>
        <p className="text-xs text-slate-500 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}
