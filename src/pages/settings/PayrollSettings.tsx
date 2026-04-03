import React, { useState } from 'react';
import { 
  MapPin, ShieldCheck, Calendar, Plus, Trash2, 
  Settings2, IndianRupee, Landmark, HelpCircle, Save,
  CheckCircle2
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry"
];

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' }
];

export default function PayrollSettings() {
  const { settings, updateSettings } = useSettings();
  
  // Local state for payroll settings
  const [state, setState] = useState<string>(settings.state || 'Maharashtra');
  const [payroll, setPayroll] = useState<any>(settings.payrollSettings || {
    epfEnabled: true,
    esiEnabled: true,
    ptEnabled: true,
    gratuityEnabled: true,
    gstNumber: '',
    panNumber: '',
    holidayList: [],
    weekends: [0] // Default to Sunday
  });

  const [newHoliday, setNewHoliday] = useState({ date: '', label: '', isWorking: false });
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    try {
      await updateSettings({
        state: state,
        payrollSettings: payroll
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      alert('Failed to save settings.');
    }
  };

  const addHoliday = () => {
    if (!newHoliday.date || !newHoliday.label) return;
    setPayroll((prev: any) => ({
      ...prev,
      holidayList: [...prev.holidayList, newHoliday].sort((a, b) => a.date.localeCompare(b.date))
    }));
    setNewHoliday({ date: '', label: '', isWorking: false });
  };

  const removeHoliday = (idx: number) => {
    setPayroll((prev: any) => ({
      ...prev,
      holidayList: prev.holidayList.filter((_: any, i: number) => i !== idx)
    }));
  };

  const toggleWeekend = (dayId: number) => {
    setPayroll((prev: any) => {
      const current = prev.weekends || [];
      const next = current.includes(dayId) 
        ? current.filter((id: number) => id !== dayId)
        : [...current, dayId];
      return { ...prev, weekends: next };
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Compliance & State */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-custom-blue/10 rounded-xl flex items-center justify-center">
                   <MapPin className="w-5 h-5 text-custom-blue" />
                </div>
                <div>
                   <h3 className="text-sm font-black text-white uppercase tracking-widest">Regional Jurisdiction</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase">Localized statutory compliance configuration</p>
                </div>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Primary Registered State</label>
                   <select 
                     value={state}
                     onChange={e => setState(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all appearance-none"
                   >
                     {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Business GSTIN</label>
                      <input 
                        type="text"
                        value={payroll.gstNumber || ''}
                        onChange={e => setPayroll((prev: any) => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                        placeholder="27AAAAA0000A1Z5"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Enterprise PAN</label>
                      <input 
                        type="text"
                        value={payroll.panNumber || ''}
                        onChange={e => setPayroll((prev: any) => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                        placeholder="ABCDE1234F"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all font-mono"
                      />
                    </div>
                 </div>
             </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                   <Calendar className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                   <h3 className="text-sm font-black text-white uppercase tracking-widest">Weekend Structure</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase">Define non-working days for payroll logic</p>
                </div>
             </div>

             <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => {
                  const isSelected = (payroll.weekends || []).includes(day.id);
                  return (
                    <button
                      key={day.id}
                      onClick={() => toggleWeekend(day.id)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                        isSelected 
                          ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20' 
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
             </div>
             <p className="text-[10px] text-slate-500 font-medium italic">Selected days will be automatically excluded from working-day counts during payroll processing.</p>
          </div>
        </div>

        {/* Holiday Calendar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Holiday Roster</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Public & Situational non-working holidays</p>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                {isSaved && <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Saved</span>}
                <button 
                  onClick={handleSave}
                  className="px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <Save className="w-3 h-3" /> Sync Cloud
                </button>
              </div>
           </div>

           <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800/50 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                 <div className="sm:col-span-5">
                    <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1">Event Name</label>
                    <input 
                      type="text"
                      value={newHoliday.label}
                      onChange={e => setNewHoliday(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. Christmas"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500 outline-none"
                    />
                 </div>
                 <div className="sm:col-span-4">
                    <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1">Date</label>
                    <input 
                      type="date"
                      value={newHoliday.date}
                      onChange={e => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500 outline-none"
                    />
                 </div>
                 <div className="sm:col-span-3">
                    <button 
                      onClick={addHoliday}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-rose-500 border border-rose-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus className="w-3 h-3" /> Add Event
                    </button>
                 </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {(payroll.holidayList || []).map((h: any, i: number) => (
                   <div key={i} className="group bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-all">
                      <div className="flex items-center gap-4">
                         <div className="text-center bg-slate-900 px-2 py-1 rounded border border-slate-800 min-w-[50px]">
                            <p className="text-[10px] font-black text-white">{new Date(h.date).getDate()}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase">{new Date(h.date).toLocaleString('default', { month: 'short' })}</p>
                         </div>
                         <div>
                            <p className="text-xs font-bold text-slate-200">{h.label}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                               Attendance Credit: <span className="text-emerald-500 font-black">100% PAID</span>
                            </p>
                         </div>
                      </div>
                      <button 
                        onClick={() => removeHoliday(i)}
                        className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                 ))}
                 {(!payroll.holidayList || payroll.holidayList.length === 0) && (
                   <div className="py-12 border-2 border-dashed border-slate-800 rounded-3xl text-center">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">No holidays defined</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6">
         <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
         </div>
         <div className="flex-1 text-center sm:text-left">
            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Payroll Integrity Check</h4>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
               Your weekend and holiday roster directly affects net payable salary. 
               Ensure your weekend structure (e.g., Every Sunday or Sat/Sun) is accurately defined before processing next month's payroll.
            </p>
         </div>
         <button 
           onClick={handleSave}
           className="px-8 py-3 bg-custom-blue hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-custom-blue/20 shrink-0"
         >
           Commit Changes
         </button>
      </div>
    </div>
  );
}
