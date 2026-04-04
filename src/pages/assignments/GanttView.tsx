import React, { useMemo, useState, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';

export default function GanttView() {
  const { assignments, tasks } = useApp();
  const { users } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Calendar Helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Generate days for the view (current month)
  const days = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      arr.push({
        day: i,
        name: d.toLocaleString('default', { weekday: 'short' }),
        dateStr: d.toISOString().split('T')[0],
      });
    }
    return arr;
  }, [year, month, daysInMonth]);

  // Group assignments by Task Type (Row Categories)
  const groupedAssignments = useMemo(() => {
    const categories: Record<string, any[]> = {};
    
    const allTypes = Array.from(new Set([
      ...tasks.map(t => t.name),
      ...assignments.map(a => a.task_type)
    ]));

    allTypes.forEach(type => categories[type] = []);

    assignments.forEach(a => {
      const aDate = new Date(a.date);
      if (aDate.getFullYear() === year && aDate.getMonth() === month) {
        if (categories[a.task_type]) {
          categories[a.task_type].push(a);
        }
      }
    });

    return categories;
  }, [assignments, tasks, year, month]);

  const cellWidth = 40; 

  return (
    <div className="flex flex-col h-[700px] bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500 font-sans">
      
      {/* Header Panel */}
      <div className="p-6 border-b border-slate-800 bg-[#0f172a] flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-custom-blue/10 rounded-xl flex items-center justify-center border border-custom-blue/20">
            <CalendarIcon className="w-5 h-5 text-custom-blue" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">Project Management</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Production Timeline • {monthName} {year}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
             <button onClick={prevMonth} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4" />
             </button>
             <button onClick={goToToday} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-colors">
                Today
             </button>
             <button onClick={nextMonth} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar - Categories */}
        <div className="w-[240px] flex-shrink-0 border-r border-slate-800 flex flex-col z-20 bg-[#0f172a]">
          <div className="h-[60px] border-b border-slate-800 p-4 flex items-center">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Task Categories</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {Object.keys(groupedAssignments).map((type) => (
              <div key={type} className="h-[100px] border-b border-slate-800 p-4 flex flex-col justify-center hover:bg-slate-900/40 transition-colors group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-white tracking-tight">{type}</span>
                  <MoreVertical className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {groupedAssignments[type].length} Assignments
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Timeline Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-[#0f172a] relative" ref={scrollRef}>
          
          <div className="sticky top-0 z-10 bg-[#0f172a]">
            <div className="flex border-b border-slate-800">
               {[1, 2, 3, 4].map(w => (
                 <div key={w} style={{ width: `${cellWidth * 7}px` }} className="flex-shrink-0 border-r border-slate-800/50 py-2 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">WEEK {w}</span>
                 </div>
               ))}
               {daysInMonth > 28 && (
                 <div style={{ width: `${cellWidth * (daysInMonth - 28)}px` }} className="flex-shrink-0 py-2 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">W5</span>
                 </div>
               )}
            </div>
            <div className="flex border-b border-slate-800 bg-slate-900/20">
              {days.map(d => (
                <div key={d.day} style={{ width: `${cellWidth}px` }} className="flex-shrink-0 h-8 border-r border-slate-800/30 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase">{d.name}</span>
                  <span className="text-[10px] font-bold text-slate-300">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute top-[60px] bottom-0 left-0 right-0 pointer-events-none flex">
            {days.map(d => (
              <div key={d.day} style={{ width: `${cellWidth}px` }} className="flex-shrink-0 h-full border-r border-slate-800/10 last:border-r-0" />
            ))}
          </div>

          <div className="relative">
             {Object.keys(groupedAssignments).map((type, idx) => {
               const dayAsmts = groupedAssignments[type];
               return (
                 <div key={type} className="h-[100px] border-b border-slate-800/50 relative group">
                   {dayAsmts.map(a => {
                     const startDay = new Date(a.date).getDate();
                     const endDay = a.due_date ? new Date(a.due_date).getDate() : startDay;
                     const duration = Math.max(1, endDay - startDay + 1);
                     const left = (startDay - 1) * cellWidth;
                     const width = duration * cellWidth;
                     const isCompleted = a.status === 'completed';
                     const worker = users.find(u => u.id === a.user_id);
                     const colors = [
                       'bg-amber-500 shadow-amber-500/20 text-amber-950',
                       'bg-lime-500 shadow-lime-500/20 text-lime-950',
                       'bg-orange-500 shadow-orange-500/20 text-orange-950',
                       'bg-sky-500 shadow-sky-500/20 text-sky-950',
                       'bg-rose-500 shadow-rose-500/20 text-rose-950'
                     ];
                     const colorClass = isCompleted ? 'bg-emerald-500 shadow-emerald-500/20 text-emerald-950' : colors[idx % colors.length];

                     return (
                       <div 
                         key={a.id}
                         className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-full ${colorClass} shadow-lg flex flex-col justify-center px-4 transition-all hover:scale-[1.02] hover:z-10 cursor-pointer overflow-hidden border border-black/5`}
                         style={{ left: `${left + 4}px`, width: `${width - 8}px` }}
                         title={`${worker?.name}: ${a.sku}`}
                       >
                         <span className="text-[10px] font-black truncate leading-none uppercase tracking-tighter">{worker?.name}</span>
                         <span className="text-[9px] font-bold opacity-60 truncate leading-none mt-0.5">{a.sku}</span>
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20" />
                       </div>
                     );
                   })}
                 </div>
               );
             })}
          </div>
        </div>
      </div>

      {/* Legend / Status Footer */}
      <div className="p-4 bg-[#0f172a] border-t border-slate-800 flex items-center justify-center gap-8">
         <div className="flex items-center gap-2">
           <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-lg shadow-sky-500/30"></div>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Phases</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"></div>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completed</span>
         </div>
         <div className="ml-auto flex items-center gap-4 text-[10px] text-slate-600 font-bold uppercase">
           <span>{assignments.length} Total assignments</span>
           <div className="h-4 w-px bg-slate-800"></div>
           <span>Scale: 1 Day / 40px</span>
         </div>
      </div>
    </div>
  );
}
