import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AttendanceLog } from '../../types';
import { CheckCircle2, XCircle, AlertCircle, Clock, Minus } from 'lucide-react';

interface AttendanceGridProps {
  month: string; // YYYY-MM
  logs: AttendanceLog[];
}

export default function AttendanceGrid({ month, logs }: AttendanceGridProps) {
  const { users } = useAuth();
  
  const daysInMonth = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    return new Date(year, monthNum, 0).getDate();
  }, [month]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const gridData = useMemo(() => {
    const data: Record<string, Record<number, AttendanceLog>> = {};
    
    users.filter(u => u.role === 'Worker').forEach(user => {
      data[user.id] = {};
      const userLogs = logs.filter(l => l.user_id === user.id && l.date.startsWith(month));
      userLogs.forEach(log => {
        const day = parseInt(log.date.split('-')[2]);
        data[user.id][day] = log;
      });
    });
    
    return data;
  }, [users, logs, month]);

  const renderStatus = (log?: AttendanceLog) => {
    if (!log) return <div className="w-full h-full flex items-center justify-center opacity-10"><Minus className="w-3 h-3" /></div>;
    
    switch (log.status) {
      case 'present': return <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="w-3.5 h-3.5" /></div>;
      case 'absent': return <div className="w-full h-full flex items-center justify-center bg-rose-500/10 text-rose-500"><XCircle className="w-3.5 h-3.5" /></div>;
      case 'half_day': return <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-blue-500"><AlertCircle className="w-3.5 h-3.5" /></div>;
      default: return null;
    }
  };

  return (
    <div className="bg-slate-900 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-950/50">
              <th className="sticky left-0 z-20 bg-slate-900 p-4 text-left border-b border-r border-white/5 min-w-[200px]">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Employee Identity</span>
              </th>
              {days.map(d => (
                <th key={d} className="p-2 border-b border-white/5 min-w-[32px] text-center">
                   <span className="text-[10px] font-black text-slate-500">{d}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.role === 'Worker').map(user => (
              <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="sticky left-0 z-10 bg-slate-900 p-4 border-r border-white/5 group-hover:bg-slate-800 transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black text-white">
                         {user.name[0]}
                      </div>
                      <div>
                         <p className="text-xs font-bold text-white">{user.name}</p>
                         <p className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">ID: {user.id.slice(0, 8)}</p>
                      </div>
                   </div>
                </td>
                {days.map(d => (
                  <td key={d} className="p-0 border-white/5 border-b border-r last:border-r-0 h-10 w-8">
                     {renderStatus(gridData[user.id][d])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-slate-950/30 border-t border-white/5 flex flex-wrap gap-6 items-center">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Present</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Absent</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Leave</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Half Day</span>
         </div>
         <p className="ml-auto text-[9px] text-slate-600 font-bold uppercase italic opacity-60">
            Automated workforce presence matrix - Real-time synchronization
         </p>
      </div>
    </div>
  );
}
