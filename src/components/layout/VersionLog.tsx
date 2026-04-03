import React, { useState, useEffect } from 'react';
import { Rocket, ChevronUp, ChevronDown, History } from 'lucide-react';

const UPDATES = [
  { v: 'v10.3', desc: 'Enhanced CRM List & Report Suite' },
  { v: 'v10.2', desc: 'Global Notification Popup Active' },
  { v: 'v10.1', desc: 'B2B/B2C Lead Categorization' },
  { v: 'v10.0', desc: 'Attendance Matrix & Payroll Persistence' },
  { v: 'v9.5', desc: 'Optimistic UI Performance Patch' }
];

export default function VersionLog() {
  const [index, setIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) return;
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % UPDATES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isExpanded]);

  return (
    <div className={`fixed top-[84px] right-8 z-50 transition-all duration-500 animate-in slide-in-from-top-4 ${isExpanded ? 'w-80' : 'w-64'}`}>
      <div className={`bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-2 ring-custom-blue/50' : 'hover:border-white/20'}`}>
        
        {/* Header / Current Version */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-custom-blue/20 flex items-center justify-center text-custom-blue shrink-0">
                <Rocket className="w-4 h-4" />
             </div>
             <div className="min-w-0">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">{UPDATES[index].v}</p>
                <p className="text-[9px] text-slate-500 font-bold truncate uppercase">{UPDATES[index].desc}</p>
             </div>
          </div>
          <div className="text-slate-600 group-hover:text-white transition-colors">
             {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        {/* Expanded History */}
        <div className={`transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
           <div className="p-4 pt-0 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-2 py-3 border-b border-white/5">
                 <History className="w-3.5 h-3.5 text-slate-500" />
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Update History</h4>
              </div>
              
              <div className="space-y-4">
                 {UPDATES.map((update, i) => (
                    <div key={i} className="relative pl-5 group/item">
                       <div className={`absolute left-0 top-1 w-2 h-2 rounded-full border-2 border-slate-900 ${i === 0 ? 'bg-custom-blue' : 'bg-slate-700'}`} />
                       {i !== UPDATES.length - 1 && <div className="absolute left-[3px] top-4 bottom-[-16px] w-[2px] bg-slate-800" />}
                       
                       <div>
                          <p className={`text-[10px] font-black uppercase tracking-tight ${i === 0 ? 'text-custom-blue' : 'text-slate-400'}`}>{update.v}</p>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">{update.desc}</p>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="bg-white/5 rounded-xl p-3 text-center">
                 <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
                    TYS-HRMS Enterprise Suite<br/>
                    <span className="text-slate-400 opacity-60 italic font-medium">Production Build - Verified</span>
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
