import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Calendar, Search, Clock, MapPin, Coffee, CheckCircle2, LayoutGrid, List } from 'lucide-react';
import AttendanceMatrix from '../../components/attendance/AttendanceMatrix';

export default function AttendancePage() {
  const { session, users, attendanceLogs, breakLogs } = useAuth();
  const { settings } = useSettings();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  const isAdmin = session.currentUser?.role === 'Admin' || session.currentUser?.role === 'Manager';
  const displayUsers = isAdmin ? users : users.filter(u => u.id === session.currentUser?.id);

  const getShiftName = (shiftId?: string) => 'Default Shift';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Time Ledger</h1>
          <p className="text-slate-400 text-sm mt-1">{viewMode === 'daily' ? 'Review clock-ins, breaks, and working hours.' : 'High-level month-wise attendance matrix.'}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {isAdmin && (
             <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center shadow-inner mr-4">
                <button 
                  onClick={() => setViewMode('daily')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'daily' ? 'bg-slate-800 text-custom-blue shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <List className="w-3.5 h-3.5" /> Granular List
                </button>
                <button 
                  onClick={() => setViewMode('monthly')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'monthly' ? 'bg-slate-800 text-custom-blue shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Monthly Matrix
                </button>
             </div>
          )}

          {viewMode === 'daily' && (
             <>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employee..."
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white w-full sm:w-48 focus:border-custom-blue outline-none hidden md:block"
                  />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-custom-blue outline-none [color-scheme:dark]"
                />
             </>
          )}
        </div>
      </div>

      {viewMode === 'daily' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-slate-800/60 bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                   <th className="px-6 py-4">Employee Context</th>
                   <th className="px-6 py-4">Clock In</th>
                   <th className="px-6 py-4">Clock Out</th>
                   <th className="px-6 py-4">Status & Breaks</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/60">
                 {displayUsers
                   .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                   .map((user) => {
                     const record = attendanceLogs.find(l => l.user_id === user.id && l.date === date);
                     const userBreaks = record ? breakLogs.filter(b => b.attendance_log_id === record.id) : [];

                     return (
                       <tr key={user.id} className="hover:bg-slate-800/20 transition-colors group">
                         <td className="px-6 py-4">
                           <div className="flex items-center">
                             <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-custom-blue text-xs font-black shrink-0 shadow-inner">
                               {user.name.charAt(0).toUpperCase()}
                             </div>
                             <div className="ml-4">
                               <div className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-custom-blue transition-colors">{user.name}</div>
                               <div className="text-[10px] text-slate-600 uppercase tracking-widest font-black mt-0.5">{user.role}</div>
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           {record?.clock_in ? (
                             <div className="flex flex-col">
                               <span className="text-sm text-white font-black mb-1 font-mono">
                                 {new Date(record.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </span>
                               <span className="inline-flex items-center text-[9px] uppercase font-black tracking-wider text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-500/20 w-fit shadow-lg shadow-blue-500/5">
                                 <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                               </span>
                             </div>
                           ) : (
                             <span className="text-sm text-slate-600 font-black opacity-20 italic">No Entry</span>
                           )}
                         </td>
                         <td className="px-6 py-4">
                           {record?.clock_out ? (
                             <span className="text-sm text-white font-black font-mono">
                               {new Date(record.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                           ) : record?.clock_in ? (
                             <span className="inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest animate-in fade-in zoom-in duration-500">
                               Session Active
                             </span>
                           ) : (
                             <span className="text-sm text-slate-600 font-black opacity-20 italic">Await Log</span>
                           )}
                         </td>
                       <td className="px-6 py-4">
                           {!record ? (
                             <div className="h-2 w-12 bg-slate-800 rounded-full animate-pulse opacity-20" />
                           ) : (
                             <div className="flex flex-wrap gap-2 text-xs">
                               {userBreaks && userBreaks.length > 0 ? (
                                 userBreaks.map((b, i) => (
                                   <div key={i} className="inline-flex items-center px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 font-black text-[9px] uppercase tracking-tighter">
                                     <Coffee className="w-3.5 h-3.5 mr-1.5" />
                                     {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                     {b.end_time ? new Date(b.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ' Now'}
                                   </div>
                                 ))
                               ) : (
                                 <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest italic opacity-40">No breaks captured</span>
                               )}
                             </div>
                           )}
                         </td>
                       </tr>
                     );
                   })}
                 {displayUsers.length === 0 && (
                   <tr>
                     <td colSpan={4} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center opacity-10">
                           <Calendar className="w-20 h-20 text-white mb-4" />
                           <p className="text-2xl font-black text-white uppercase tracking-tighter italic">Operational Void</p>
                           <p className="text-xs text-white font-bold tracking-[0.2em] mt-2">NO ATTENDANCE PAYLOAD DETECTED</p>
                        </div>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      ) : (
        <AttendanceMatrix />
      )}
    </div>
  );
}
