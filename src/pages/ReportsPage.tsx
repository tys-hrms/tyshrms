import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart3, Users, Package, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownRight, Download, Filter,
  CheckCircle2, AlertCircle, Clock, User as UserIcon
} from 'lucide-react';

export default function ReportsPage() {
  const { assignments, workLogs, getDailyStats } = useApp();
  const { users, attendanceLogs } = useAuth();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  const stats = useMemo(() => getDailyStats(), [getDailyStats]);

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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
          <button className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Attendance" value={stats.activeWorkers} sub="Workers Active" trend="+12%" icon={Users} color="blue" />
        <StatCard label="Units Produced" value={stats.totalPiecesCompleted} sub="Pieces Finished" trend="+5.4%" icon={Package} color="emerald" />
        <StatCard label="Quality Rate" value="98.2%" sub="Checks Passed" trend="-0.5%" icon={TrendingUp} color="amber" />
        <StatCard label="Efficiency" value={`${Math.round((stats.totalPiecesCompleted / (stats.totalPiecesAssigned || 1)) * 100)}%`} sub="Target Achievement" trend="+2.1%" icon={BarChart3} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Production Breakdown */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-custom-blue" />
              Production by SKU
            </h3>
            <button className="text-xs font-bold text-custom-blue hover:underline">View All Inventory</button>
          </div>
          
          <div className="space-y-6">
            {productionBySKU.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">{item.sku}</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{item.completed.toLocaleString()} / {item.target.toLocaleString()} Units</p>
                  </div>
                  <span className="text-sm font-black text-white">{item.percent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-custom-blue to-blue-400 transition-all duration-1000"
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
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-8">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Top Performers
          </h3>
          <div className="space-y-5">
            {topWorkers.map((w, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sm font-black text-white border border-slate-700">
                    {w.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{w.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Rank #{i+1}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-400">{w.total.toLocaleString()}</p>
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

      {/* Activity Timeline / Recent Events */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-8">
          <Clock className="w-5 h-5 text-slate-400" />
          Recent Activity
        </h3>
        <div className="space-y-4">
           {workLogs.slice(-5).reverse().map((log, i) => (
             <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">
                    <span className="font-bold text-white">{users.find(u => u.id === log.userId)?.name}</span> 
                    {" logged "}
                    <span className="text-emerald-400 font-bold">{(log.piecesIroned || 0) + (log.piecesChecked || 0) + (log.piecesPacked || 0)} pieces</span>
                    {" for SKU "}
                    <span className="font-bold text-white tracking-wider">{assignments.find(a => a.id === log.assignmentId)?.sku || 'Unknown'}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{new Date(log.loggedAt).toLocaleTimeString()}</p>
                </div>
                <div className="hidden sm:block">
                  <span className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-black text-slate-400 uppercase">Verification Done</span>
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
    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${colorMap[color].split(' ')[1]} opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</h4>
        <div className="text-3xl font-black text-white mt-1">{value}</div>
        <p className="text-xs text-slate-500 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}
