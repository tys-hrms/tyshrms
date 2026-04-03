import React, { useState } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { 
  Settings, Clock, Bell, Layers, Plus, Trash2, 
  CheckCircle2, Hash, Zap, ShieldAlert, Palette, UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function CRMSettings() {
  const { settings, updateSettings } = useCRM();
  const { users } = useAuth();
  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateForm = (updates: any) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addStage = () => {
    const newStage = {
      id: `stage_${Date.now()}`,
      label: 'New Stage',
      color: '#94a3b8',
      order: formData.stages.length
    };
    updateForm({ stages: [...formData.stages, newStage] });
  };

  const removeStage = (id: string) => {
    if (formData.stages.length <= 1) return;
    updateForm({ stages: formData.stages.filter(s => s.id !== id) });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-custom-blue" />
            CRM Module Configuration
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Tenant-level controls for lead routing, ticketing, and pipelines.</p>
        </div>
        <div className="flex items-center gap-4">
          {showSuccess && (
             <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold animate-pulse bg-emerald-500/10 px-3 py-2 rounded-full border border-emerald-500/20">
               <CheckCircle2 className="w-4 h-4" /> Cloud Synced
             </div>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-custom-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-custom-blue/20 transition-all active:scale-95"
          >
            {isSaving ? 'Syncing...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── Smart Assignment & Ticketing ─── */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-custom-blue/10 rounded-xl">
                    <Zap className="w-5 h-5 text-custom-blue" />
                </div>
                <div>
                   <h3 className="text-md font-bold text-white">Smart-Assignment Engine</h3>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Automated Failsafe Routing</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                   <div>
                      <p className="text-sm font-bold text-white uppercase tracking-wider">Enable Attendance-Based Routing</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Leads only assign to Clocked-In Reps.</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.enableSmartAssignment} onChange={e => updateForm({ enableSmartAssignment: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-custom-blue"></div>
                   </label>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                     <Hash className="w-3 h-3 text-custom-blue" /> Ticket Sequence Prefix
                   </label>
                   <input 
                      type="text" 
                      value={formData.ticketPrefix}
                      onChange={e => updateForm({ ticketPrefix: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-custom-blue outline-none transition-all font-mono font-bold"
                   />
                   <p className="text-[10px] text-slate-600 mt-2">Example: {formData.ticketPrefix}-2024-0204-000001</p>
                </div>
             </div>
          </div>

          {/* ─── Pipeline Stages ─── */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl">
                        <Layers className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                       <h3 className="text-md font-bold text-white">Pipeline Stages</h3>
                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Kanban Layout Management</p>
                    </div>
                </div>
                <button onClick={addStage} className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl">
                   <Plus className="w-4 h-4" />
                </button>
             </div>

              <div className="space-y-3">
                {formData.stages.sort((a,b) => a.order - b.order).map(stage => (
                   <div key={stage.id} className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800 group translate-all hover:border-purple-500/30">
                      <input 
                         type="color" 
                         value={stage.color}
                         onChange={e => {
                            const nextStages = formData.stages.map(s => s.id === stage.id ? { ...s, color: e.target.value } : s);
                            updateForm({ stages: nextStages });
                         }}
                         className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                      />
                      <input 
                         type="text"
                         value={stage.label}
                         onChange={e => {
                            const nextStages = formData.stages.map(s => s.id === stage.id ? { ...s, label: e.target.value } : s);
                            updateForm({ stages: nextStages });
                         }}
                         className="flex-1 bg-transparent border-none text-sm font-bold text-white focus:ring-0 px-0"
                      />
                      <button 
                         onClick={() => removeStage(stage.id)}
                         className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* ─── SLA Configurations ─── */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                    <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                   <h3 className="text-md font-bold text-white">SLA Timers (Response Time)</h3>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Automated Breach Detectors</p>
                </div>
             </div>

              <div className="space-y-3">
                {Object.entries(formData.slaConfig).map(([source, minutes]) => (
                   <div key={source} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                         <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <input 
                            type="number"
                            value={minutes}
                            onChange={e => {
                               const nextSla = { ...formData.slaConfig, [source]: parseInt(e.target.value) || 0 };
                               updateForm({ slaConfig: nextSla });
                            }}
                            className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:border-emerald-500 outline-none"
                         />
                         <span className="text-[10px] font-bold text-slate-600 uppercase">Min</span>
                      </div>
                   </div>
                ))}
             </div>
             
             <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                <Bell className="w-4 h-4 text-emerald-500 mt-0.5" />
                <p className="text-[10px] text-emerald-400 font-medium leading-relaxed uppercase tracking-tight">
                    Breached tickets will flash <span className="font-black text-white px-1.5 py-0.5 bg-rose-500 rounded">RED</span> on all tagged reps' dashboards until acknowledged or reassigned.
                </p>
             </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-rose-500/10 rounded-xl">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                   <h3 className="text-md font-bold text-white">Escalation Matrix</h3>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Manager Overrides</p>
                </div>
             </div>
             
             <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Escalation Recipients</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
                   {users.filter(u => u.role === 'Admin' || u.role === 'Manager').map(user => {
                      const isEscalationRep = formData.escalationUserIds?.includes(user.id);
                      return (
                         <button 
                           key={user.id}
                           onClick={() => {
                              const nextEscalation = isEscalationRep 
                                 ? (formData.escalationUserIds || []).filter(id => id !== user.id)
                                 : [...(formData.escalationUserIds || []), user.id];
                              updateForm({ escalationUserIds: nextEscalation });
                           }}
                           className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                              isEscalationRep 
                                 ? 'bg-rose-500/10 border-rose-500 text-rose-500' 
                                 : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                           }`}
                         >
                            <UserCheck className={`w-3 h-3 ${isEscalationRep ? 'text-rose-500' : 'text-slate-700'}`} />
                            {user.name} ({user.role})
                         </button>
                      );
                   })}
                </div>
                <div className="mt-4 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                   <p className="text-[10px] text-rose-400 font-medium leading-relaxed uppercase tracking-tight">
                      Selected Managers will receive <span className="font-black underline">Critical Escalation Alerts</span> on their primary dashboard for any ticket that exceeds the SLA timer.
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
