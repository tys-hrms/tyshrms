import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { 
  CheckCircle2, Clock, Users, Package, TrendingUp, AlertCircle, 
  Printer, Activity, ShieldAlert, CheckSquare,
  PieChart
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePie, Pie, Cell, RadarChart, PolarGrid, 
  PolarAngleAxis, Radar
} from 'recharts';
import { useCRM } from '../contexts/CRMContext';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { session, attendanceLogs } = useAuth();
  const { getDailyStats, notifications, markNotificationRead, workLogs } = useApp();
  const { leads } = useCRM();
  
  const today = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => getDailyStats(today), [getDailyStats, today]);
  const urgentAlerts = notifications.filter(n => n.type === 'alert' && !n.read);

  const weeklyAttendanceData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => ({
      name: new Date(date).toLocaleDateString('en-GB', { weekday: 'short' }),
      count: attendanceLogs.filter((l: any) => l.date === date).length
    }));
  }, [attendanceLogs]);

  const crmStageData = useMemo(() => {
    const stages = [
      { id: 'lead_in', label: 'Lead In', color: '#3b82f6' },
      { id: 'qualification', label: 'Qualified', color: '#8b5cf6' },
      { id: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
      { id: 'fulfillment', label: 'Closed', color: '#10b981' },
    ];
    return stages.map(s => ({
      name: s.label,
      value: leads.filter(l => l.stage === s.id).length,
      color: s.color
    })).filter(s => s.value > 0);
  }, [leads]);

  const productivityData = useMemo(() => {
    const taskTypes = ['Ironing', 'Checking', 'Labelling', 'Packing'];
    return taskTypes.map(type => ({
      subject: type,
      A: workLogs.filter((l: any) => l.task_type?.toLowerCase().includes(type.toLowerCase().slice(0, 4))).length,
      fullMark: 150
    }));
  }, [workLogs]);

  const handlePrint = () => { window.print(); };
  
  const cards = [
    { label: 'Total Pieces Assigned', value: stats.total_pieces_assigned, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Pieces Completed', value: stats.total_pieces_completed, icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Pending / Carried', value: stats.total_pieces_pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Defects / Rejected', value: stats.total_rejected, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Active Workers', value: stats.active_workers, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Workers on Leave', value: stats.on_leave, icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  const progress = stats.total_pieces_assigned > 0 ? Math.round((stats.total_pieces_completed / stats.total_pieces_assigned) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {session.currentUser?.name?.split(' ')[0]}</h1>
          <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest">
          <Printer className="w-4 h-4" /> Print Summary
        </button>
      </div>

      {stats.total_pieces_assigned === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center animate-in zoom-in duration-500">
           <div className="w-20 h-20 bg-custom-blue/10 rounded-full flex items-center justify-center mb-6"><Package className="w-10 h-10 text-custom-blue" /></div>
           <h2 className="text-xl font-bold text-white mb-2">Welcome to your HRMS Operations</h2>
           <p className="text-slate-400 text-sm max-w-md mb-8">You haven't assigned any pieces yet today. Head over to the Assignments page to start tracking your workforce productivity.</p>
           <button onClick={() => navigate('/assignments')} className="px-6 py-3 bg-custom-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 underline underline-offset-4 decoration-white/20 hover:decoration-white decoration-2"><Package className="w-4 h-4" /> Create First Assignment</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${c.bg}`}><c.icon className={`w-6 h-6 ${c.color}`} /></div>
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-white">{c.value}</p>
                  <p className="text-sm font-medium text-slate-400 mt-1">{c.label}</p>
                </div>
              </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-6 flex flex-col shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"><ShieldAlert className="w-5 h-5 text-rose-500" /> Support Queue</h3>
            {urgentAlerts.length > 0 && <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">{urgentAlerts.length} ACTIVE</span>}
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {urgentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 text-center"><CheckCircle2 className="w-12 h-12 mb-3 opacity-20" /><p className="text-sm font-bold uppercase tracking-widest opacity-40">All clear</p></div>
            ) : (
              urgentAlerts.map(alert => (
                  <div key={alert.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-500/40 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded">Urgent Help</span>
                       <span className="text-[10px] font-bold text-slate-600 uppercase">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Worker signaled help</p>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">{alert.message}</p>
                    <button onClick={() => markNotificationRead(alert.id)} className="w-full py-2 bg-slate-800 hover:bg-emerald-500 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"><CheckSquare className="w-3.5 h-3.5" /> Resolve</button>
                  </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Workforce Presence</h3>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyAttendanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px'}} itemStyle={{color: '#fff'}} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
               <div className="flex items-center justify-between mb-6"><h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><PieChart className="w-4 h-4 text-custom-blue" /> Lead Funnel</h3></div>
               <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePie>
                      <Pie data={crmStageData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {crmStageData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px'}} />
                    </RePie>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-xl font-black text-white">{leads.length}</span>
                     <span className="text-[8px] font-bold text-slate-500 uppercase">Leads</span>
                  </div>
               </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 block">Task Efficiency</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius={80} data={productivityData}>
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 10}} />
                      <Radar name="Productivity" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
             </div>
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-center">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Live Productivity</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <span className="text-xs text-slate-400">Completion Rate</span>
                      <span className="text-lg font-black text-emerald-500">{progress}%</span>
                   </div>
                   <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{width: `${progress}%`}} />
                   </div>
                   <p className="text-[10px] text-slate-500 leading-relaxed italic">* Data refreshes automatically every 5 seconds.</p>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Action Items</h2>
          {stats.total_pieces_pending > 0 ? (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <div className="flex items-center text-orange-400 mb-2"><AlertCircle className="w-5 h-5 mr-2" /><span className="font-semibold">Pending Work</span></div>
              <p className="text-sm text-slate-300">You have {stats.total_pieces_pending} pieces pending to be completed today.</p>
            </div>
          ) : (
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl">
              <div className="flex items-center text-teal-400 mb-2"><CheckCircle2 className="w-5 h-5 mr-2" /><span className="font-semibold">All Caught Up</span></div>
              <p className="text-sm text-slate-300">No pending pieces for today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
