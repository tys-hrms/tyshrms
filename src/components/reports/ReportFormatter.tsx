import React from 'react';
import { Palette, Layout, Eye, EyeOff, Building2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

export type ReportTheme = 'tally' | 'modern' | 'compact';

interface ReportFormatterProps {
  theme: ReportTheme;
  setTheme: (theme: ReportTheme) => void;
  visibleFields: string[];
  toggleField: (field: string) => void;
  showBranding: boolean;
  setShowBranding: (v: boolean) => void;
}

export default function ReportFormatter({
  theme,
  setTheme,
  visibleFields,
  toggleField,
  showBranding,
  setShowBranding
}: ReportFormatterProps) {
  const themes: { id: ReportTheme; label: string; icon: any; color: string }[] = [
    { id: 'tally', label: 'Tally Classic', icon: Layout, color: 'text-amber-500' },
    { id: 'modern', label: 'Modern Dashboard', icon: Palette, color: 'text-custom-blue' },
    { id: 'compact', label: 'Compact List', icon: CheckCircle2, color: 'text-emerald-500' }
  ];

  const reportFields = [
    { id: 'attendance', label: 'Attendance Stats' },
    { id: 'quality', label: 'Quality Metrics' },
    { id: 'sku_ledger', label: 'SKU Production' },
    { id: 'leaderboard', label: 'Worker Leaderboard' },
    { id: 'activity_log', label: 'Activity Logs' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-custom-blue/10 rounded-xl">
           <Palette className="w-5 h-5 text-custom-blue" />
        </div>
        <div>
           <h3 className="text-md font-bold text-white uppercase tracking-tight">Formatting Suite</h3>
           <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Report Visual Engine</p>
        </div>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {/* Theme Selection */}
         <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Document Theme</label>
            <div className="grid grid-cols-1 gap-3">
               {themes.map(t => {
                  const Icon = t.icon;
                  const isActive = theme === t.id;
                  return (
                     <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                           isActive 
                              ? 'bg-slate-800 border-custom-blue shadow-lg shadow-custom-blue/10' 
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-60'
                        }`}
                     >
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-custom-blue/20' : 'bg-slate-900 group-hover:bg-slate-800'}`}>
                           <Icon className={`w-4 h-4 ${isActive ? t.color : 'text-slate-500'}`} />
                        </div>
                        <div>
                           <p className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{t.label}</p>
                           <p className="text-[9px] text-slate-600 mt-0.5 uppercase font-medium">Standardized layout format</p>
                        </div>
                     </button>
                  );
               })}
            </div>
         </div>

         {/* Field Visibility */}
         <div className="space-y-4 pt-4 border-t border-slate-800/50">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data Sections (Toggles)</label>
            <div className="space-y-2">
               {reportFields.map(field => {
                  const isVisible = visibleFields.includes(field.id);
                  return (
                     <button
                        key={field.id}
                        onClick={() => toggleField(field.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isVisible 
                            ? 'bg-slate-800/40 border-slate-700 text-white' 
                            : 'bg-slate-950 border-slate-900 text-slate-600'
                        }`}
                     >
                        <span className="text-[11px] font-bold uppercase tracking-tight">{field.label}</span>
                        {isVisible ? <Eye className="w-3.5 h-3.5 text-custom-blue" /> : <EyeOff className="w-3.5 h-3.5" />}
                     </button>
                  );
               })}
            </div>
         </div>

         {/* Brand Overrides */}
         <div className="space-y-4 pt-4 border-t border-slate-800/50">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Branding Overrides</label>
            <div 
               onClick={() => setShowBranding(!showBranding)}
               className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                  showBranding 
                     ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                     : 'bg-slate-950 border-slate-800 text-slate-600'
               }`}
            >
               <div className={`p-2 rounded-lg ${showBranding ? 'bg-emerald-500/20' : 'bg-slate-900'}`}>
                  {showBranding ? <Building2 className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
               </div>
               <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-tight">Print Company Header</p>
                  <p className="text-[9px] font-medium opacity-60">Logo, Address & Contact Details</p>
               </div>
               <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${showBranding ? 'border-emerald-500 bg-emerald-500' : 'border-slate-800'}`}>
                  {showBranding && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
               </div>
            </div>
         </div>
      </div>

      <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
         <Palette className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
         <p className="text-[10px] text-amber-500/80 font-medium leading-relaxed uppercase tracking-tight">
             Selected formatting will be applied directly to the <span className="font-bold underline text-amber-400 uppercase">Live Print Engine</span> for A4/Tabloid exports.
         </p>
      </div>
    </div>
  );
}
