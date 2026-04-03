import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Download, Filter, 
  Search, User, Calendar as CalendarIcon, Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useApp } from '../../contexts/AppContext';

export default function AttendanceMatrix() {
  const { users, attendanceLogs } = useAuth();
  const { settings } = useSettings();
  const { leaves } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const getDayStatus = (userId: string, day: number) => {
    const formattedDate = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // 1. Check Holiday (from settings)
    const holiday = settings.payrollSettings?.holidayList.find(h => h.date === formattedDate);
    if (holiday) return { active: true, type: 'H', label: holiday.label, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };

    // 2. Check Weekend (Sat/Sun)
    const d = new Date(year, currentDate.getMonth(), day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
       return { active: true, type: 'W', label: 'Weekend', color: 'bg-slate-800 text-slate-500' };
    }

    // 3. Check Leave
    const leave = leaves.find(l => 
      l.userId === userId && 
      l.status === 'approved' && 
      formattedDate >= l.date && 
      formattedDate <= (l.endDate || l.date)
    );
    if (leave) return { active: true, type: 'L', label: `Leave: ${leave.type}`, color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };

    // 4. Check Attendance Record
    const record = attendanceLogs.find(l => l.userId === userId && l.date === formattedDate);
    if (record) {
      if (record.clockIn) return { active: true, type: 'P', label: 'Present', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }

    // 5. Default: Absent (for past days)
    if (new Date(formattedDate) < new Date()) {
       return { active: true, type: 'A', label: 'Absent', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    }

    return { active: false, type: '', label: '', color: 'bg-slate-900/50 text-slate-700' };
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Matrix Controls */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-1">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><ChevronLeft className="w-5 h-5" /></button>
              <span className="px-4 text-xs font-black text-white uppercase tracking-widest min-w-[120px] text-center">{monthName} {year}</span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-all group relative">
                 <ChevronRight className="w-5 h-5" />
              </button>
           </div>
           
           <div className="relative">
             <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
             <input 
               type="text"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Filter master-list..."
               className="bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white w-48 focus:border-custom-blue outline-none transition-all"
             />
           </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-4 px-4 py-2 border-r border-slate-800 mr-2">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded" /> <span className="text-[10px] font-black text-slate-500 uppercase">P</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-500 rounded" /> <span className="text-[10px] font-black text-slate-500 uppercase">A</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded" /> <span className="text-[10px] font-black text-slate-500 uppercase">H</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500 rounded" /> <span className="text-[10px] font-black text-slate-500 uppercase">L</span></div>
           </div>
           <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all text-xs font-black uppercase tracking-widest">
              <Download className="w-4 h-4" /> Export CSV
           </button>
        </div>
      </div>

      {/* Grid Render */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
           <table className="w-full text-left border-collapse table-fixed">
              <thead>
                 <tr className="bg-slate-950/50 border-b border-slate-800">
                    <th className="sticky left-0 z-20 bg-slate-950 px-6 py-5 w-[240px] border-r border-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resource Name</span>
                    </th>
                    {days.map(d => (
                       <th key={d} className="px-2 py-5 text-center w-[40px] border-r border-slate-800/30">
                          <span className="text-[10px] font-black text-slate-500">{String(d).padStart(2, '0')}</span>
                       </th>
                    ))}
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                 {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                       <td className="sticky left-0 z-20 bg-slate-900 px-6 py-4 flex items-center gap-3 border-r border-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)] group-hover:bg-slate-800/50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-custom-blue uppercase shrink-0">
                             {user.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                             <p className="text-xs font-bold text-white truncate uppercase tracking-wide">{user.name}</p>
                             <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter truncate opacity-60">{user.role}</p>
                          </div>
                       </td>
                       {days.map(d => {
                          const status = getDayStatus(user.id, d);
                          return (
                             <td key={d} className="px-1 py-1 border-r border-slate-800/30 text-center">
                                <div 
                                  title={status.label}
                                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-[9px] font-black uppercase transition-all ${status.color} cursor-help hover:scale-110`}
                                >
                                   {status.type || '·'}
                                </div>
                             </td>
                          );
                       })}
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-5 flex items-start gap-4">
         <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
         <div className="space-y-1">
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Master Grid Intelligence</h4>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
               This matrix is the single source of truth for salary calculation. Ensure <span className="text-blue-400 font-bold">Holidays (H)</span> and <span className="text-amber-500 font-bold">Approved Leaves (L)</span> are properly tagged in their respective modules before finalizing payroll. 
               Saturday/Sunday are automatically tagged as <span className="text-slate-400 font-bold">Weekends (W)</span> unless overrides are set in the settings.
            </p>
         </div>
      </div>
    </div>
  );
}
