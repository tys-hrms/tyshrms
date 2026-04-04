import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useRBAC } from '../contexts/RBACContext';
import { 
  BarChart3, Users, Package, TrendingUp, Calendar, 
  ArrowUpRight, ArrowDownRight, Download, Filter,
  CheckCircle2, AlertCircle, Clock, User as UserIcon
} from 'lucide-react';
import ReportFormatter, { ReportTheme } from '../components/reports/ReportFormatter';

export default function ReportsPage() {
  const { assignments, workLogs, getDailyStats } = useApp();
  const { session, users } = useAuth();
  const { settings } = useSettings();
  const { permissions } = useRBAC();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  // report formatting states
  const [reportTheme, setReportTheme] = useState<ReportTheme>('tally');
  const [visibleFields, setVisibleFields] = useState<string[]>(['attendance', 'quality', 'sku_ledger', 'leaderboard', 'activity_log']);
  const [showBranding, setShowBranding] = useState(true);

  const toggleField = (field: string) => {
    setVisibleFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const stats = useMemo(() => getDailyStats(), [getDailyStats]);

  // --- Dynamic Quality Rate Calculation ---
  const qualityRate = useMemo(() => {
    const totalProcessed = stats.total_pieces_completed + stats.total_rejected;
    if (totalProcessed === 0) return '0%';
    return `${Math.round((stats.total_pieces_completed / totalProcessed) * 100)}%`;
  }, [stats]);

  const canPrint = useMemo(() => {
     if (session.currentUser?.role === 'Admin') return true;
     const perm = permissions.find((p: any) => p.role === session.currentUser?.role);
     return perm?.features?.system_print_allowed ?? false;
  }, [session.currentUser?.role, permissions]);

  const handlePrint = () => {
    if (!canPrint) return alert('Your user role does not have permission to print system records.');
    window.print();
  };

  // --- Process Production Data ---
  const productionBySKU = useMemo(() => {
    const counts: Record<string, { completed: number; target: number }> = {};
    assignments.forEach(a => {
      if (!counts[a.sku]) counts[a.sku] = { completed: 0, target: 0 };
      counts[a.sku].completed += a.pieces_completed;
      counts[a.sku].target += (a.target_qty || a.pieces_assigned);
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
      const pieces = (log.pieces_ironed || 0) + (log.pieces_checked || 0) + (log.pieces_packed || 0);
      performance[log.user_id] = (performance[log.user_id] || 0) + pieces;
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
    <>
      {/* App UI - Hidden during printing */}
      <div className="space-y-8 animate-in fade-in duration-500 print:hidden">
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
            {canPrint && (
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
              >
                <Download className="w-4 h-4" />
                Print to A4
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid with Formatter Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
           {/* Left Sidebar - Formatter */}
           <div className="xl:col-span-1 h-fit sticky top-24">
              <ReportFormatter 
                theme={reportTheme}
                setTheme={setReportTheme}
                visibleFields={visibleFields}
                toggleField={toggleField}
                showBranding={showBranding}
                setShowBranding={setShowBranding}
              />
           </div>

           {/* Right Content - Live Preview-ish / Dashboard */}
           <div className="xl:col-span-3 space-y-8">
              {/* Hero Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Attendance" value={stats.active_workers} sub="Workers Active" icon={Users} color="blue" trend="+2.4%" />
                <StatCard label="Units Produced" value={stats.total_pieces_completed} sub="Pieces Finished" icon={Package} color="emerald" trend="+12.5%" />
                <StatCard label="Quality Rate" value={qualityRate} sub="Checks Passed" icon={TrendingUp} color="amber" trend="+0.8%" />
                <StatCard label="Efficiency" value={`${Math.round((stats.total_pieces_completed / (stats.total_pieces_assigned || 1)) * 100)}%`} sub="Target Achievement" icon={BarChart3} color="purple" trend="-1.2%" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Production Breakdown */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-custom-blue" />
                        Production by SKU
                      </h3>
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
                         <div className="py-20 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-700/50">
                                <Package className="w-8 h-8 text-slate-500" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Analytical Void</p>
                            <p className="text-xs text-slate-600 max-w-xs">No SKU production data detected.</p>
                         </div>
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
                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sm font-black text-white">
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
                   </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-8">
                   <Clock className="w-5 h-5 text-slate-400" />
                   Recent Activity Summary
                 </h3>
                 <div className="space-y-4">
                    {workLogs.slice(-5).reverse().map((log, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-transparent px-0 border-b border-white/[0.02]">
                         <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                           <UserIcon className="w-4 h-4 text-slate-500" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-xs text-slate-300">
                             <span className="font-bold text-white">{users.find(u => u.id === log.user_id)?.name}</span> 
                             {" logged "}
                             <span className="text-emerald-400 font-bold">{(log.pieces_ironed || 0) + (log.pieces_checked || 0) + (log.pieces_packed || 0)} pieces</span>
                           </p>
                           <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">{new Date(log.logged_at).toLocaleString()}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Print Engine - Dynamic based on Formatting Suite */}
      <div className={`hidden print:block bg-white text-black min-h-screen font-serif ${reportTheme === 'compact' ? 'text-[10px]' : 'text-sm'}`}>
        
        {/* Branding Header */}
        {showBranding && (
          <div className={`border-b-4 border-black pb-4 mb-8 text-center mt-8 ${reportTheme === 'modern' ? 'bg-slate-50 border-double' : ''}`}>
              <h1 className={`${reportTheme === 'tally' ? 'text-4xl' : 'text-3xl'} font-black uppercase tracking-widest`}>{settings.branding.company_name || 'CORPORATE'}</h1>
              <p className="text-sm font-bold mt-2 uppercase tracking-tighter">Operational Intelligence Statement</p>
              <p className="text-[10px] uppercase mt-1">Ref ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} | GMT {new Date().toLocaleString()}</p>
          </div>
        )}

        {/* Attendance & Macro Section */}
        {visibleFields.includes('attendance') && (
           <div className="mb-8">
             <h2 className="text-md font-bold uppercase border-b border-black pb-1 mb-2 flex items-center gap-2">
                1. Macro Statistics & Attendance
             </h2>
             <table className="w-full border-collapse border border-black text-left">
                <tbody>
                  <tr className="border-b border-black">
                    <th className="p-2 border-r border-black w-1/2 uppercase tracking-tighter">Total Workforce Attendance</th>
                    <td className="p-2 font-mono font-bold">{stats.active_workers} Employees Active</td>
                  </tr>
                  {visibleFields.includes('quality') && (
                    <tr className="border-b border-black">
                      <th className="p-2 border-r border-black uppercase tracking-tighter">Quality Control Passthrough</th>
                      <td className="p-2 font-mono font-bold text-emerald-700">{qualityRate} ACCURATE</td>
                    </tr>
                  )}
                  <tr>
                    <th className="p-2 border-r border-black uppercase tracking-tighter">Gross Production Yield</th>
                    <td className="p-2 font-mono font-bold">{stats.total_pieces_completed.toLocaleString()} UNITS COMPLETE</td>
                  </tr>
                </tbody>
             </table>
           </div>
        )}

        {/* SKU Production Ledger */}
        {visibleFields.includes('sku_ledger') && (
           <div className="mb-8 font-serif">
              <h2 className="text-md font-bold uppercase border-b border-black pb-1 mb-2">2. Production Inventory Ledger</h2>
              <table className="w-full border-collapse border border-black text-left">
                <thead className="bg-black text-white">
                   <tr>
                      <th className="p-2 border border-black uppercase">SKU Identifier</th>
                      <th className="p-2 border border-black text-right uppercase">Completed</th>
                      <th className="p-2 border border-black text-right uppercase">Target</th>
                      <th className="p-2 border border-black text-right uppercase">Yield %</th>
                   </tr>
                </thead>
                <tbody>
                  {productionBySKU.map((item, i) => (
                    <tr key={i} className="border-b border-black">
                      <td className="p-2 border-r border-black font-bold uppercase tracking-widest">{item.sku}</td>
                      <td className="p-2 border-r border-black text-right font-mono font-bold">{item.completed.toLocaleString()}</td>
                      <td className="p-2 border-r border-black text-right font-mono">{item.target.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono font-black">{item.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        )}

        {/* Workforce Performance */}
        {visibleFields.includes('leaderboard') && (
           <div className="mb-8 font-serif">
              <h2 className="text-md font-bold uppercase border-b border-black pb-1 mb-2">3. Workforce Efficiency Performance</h2>
              <table className="w-full border-collapse border border-black text-left">
                <thead className="bg-black text-white">
                   <tr>
                      <th className="p-2 border border-black uppercase">Efficiency Rank</th>
                      <th className="p-2 border border-black uppercase">Employee Full Name</th>
                      <th className="p-2 border border-black text-right uppercase">Net Units Cleared</th>
                   </tr>
                </thead>
                <tbody>
                  {topWorkers.map((w, i) => (
                    <tr key={i} className="border-b border-black">
                      <td className="p-2 border-r border-black font-bold text-center">#{i + 1}</td>
                      <td className="p-2 border-r border-black uppercase font-bold">{w.name}</td>
                      <td className="p-2 text-right font-mono font-bold">{w.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        )}

        {/* Activity Log Audit */}
        {visibleFields.includes('activity_log') && (
           <div className="mb-8 font-serif">
              <h2 className="text-md font-bold uppercase border-b border-black pb-1 mb-2">4. Tactical Activity Audit Log</h2>
              <div className="space-y-1">
                 {workLogs.slice(-20).reverse().map((log, i) => (
                    <div key={i} className="text-[10px] border-b border-black/10 py-1 flex justify-between">
                       <span>[{new Date(log.logged_at).toLocaleTimeString()}] {users.find(u => u.id === log.user_id)?.name} processed product flow.</span>
                       <span className="font-mono font-bold uppercase tracking-widest">{(log.pieces_ironed || 0) + (log.pieces_checked || 0) + (log.pieces_packed || 0)} UNITS</span>
                    </div>
                 ))}
              </div>
           </div>
        )}
        
        <div className="text-center text-[10px] mt-16 pt-8 border-t border-black border-dashed">
          <p className="font-bold uppercase tracking-[0.3em]">*** END OF INTELLIGENCE STATEMENT ***</p>
          <div className="mt-8 flex justify-between px-12">
             <div className="text-left">
                <p className="border-b border-black w-48 mb-1"></p>
                <p className="uppercase font-bold">Authorized Auditor</p>
             </div>
             <div className="text-right">
                <p className="border-b border-black w-48 mb-1"></p>
                <p className="uppercase font-bold">Facility Supervisor</p>
             </div>
          </div>
        </div>
      </div>
    </>
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
           <TrendingUp className="w-3 h-3" />
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
