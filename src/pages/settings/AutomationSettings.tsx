import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { MessageSquare, Mail, Bell, ShieldCheck, Save, Phone, Info, CheckCircle2 } from 'lucide-react';

export default function AutomationSettings() {
  const { settings, updateLeaveAutomation } = useSettings();
  const [formData, setFormData] = useState(settings.leaveAutomation);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateLeaveAutomation(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in slide-in-from-bottom-2 duration-400">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-custom-blue/5 blur-3xl rounded-full -mr-16 -mt-16" />
        
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="w-10 h-10 bg-custom-blue/10 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-custom-blue" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Communication Workflow</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Automated Worker Notification Triggers</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          {/* Master Toggle */}
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-tight">Master Leave Automation</p>
                <p className="text-xs text-slate-500 mt-0.5">Allow system to trigger external notifications</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
              className={`w-14 h-7 rounded-full transition-all relative ${formData.enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800'}`}
            >
              <div className={`absolute top-1.5 w-4 h-4 bg-white rounded-full transition-all ${formData.enabled ? 'left-8' : 'left-1.5'}`} />
            </button>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity duration-300 ${formData.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            
            {/* WhatsApp Integration */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">WhatsApp Direct</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, whatsappEnabled: !formData.whatsappEnabled })}
                  className={`w-10 h-5 rounded-full transition-all relative ${formData.whatsappEnabled ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.whatsappEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Message Template</label>
                <textarea
                  value={formData.whatsappTemplate}
                  onChange={e => setFormData({ ...formData, whatsappTemplate: e.target.value })}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 focus:border-custom-blue outline-none resize-none transition-all placeholder:text-slate-700"
                  placeholder="Draft your message..."
                />
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 flex gap-2">
                  <Info className="w-3.5 h-3.5 text-custom-blue shrink-0" />
                  <p className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed">
                    Use tags: <span className="text-slate-400">{"{worker_name}, {start_date}, {end_date}, {status}, {reviewer_name}, {reason}"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Email Integration */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-custom-blue" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Email Notification</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, emailEnabled: !formData.emailEnabled })}
                  className={`w-10 h-5 rounded-full transition-all relative ${formData.emailEnabled ? 'bg-custom-blue' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.emailEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Body Template</label>
                <textarea
                  value={formData.emailTemplate}
                  onChange={e => setFormData({ ...formData, emailTemplate: e.target.value })}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 focus:border-custom-blue outline-none resize-none transition-all placeholder:text-slate-700"
                  placeholder="Draft your email..."
                />
                 <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 flex gap-2">
                  <Info className="w-3.5 h-3.5 text-custom-blue shrink-0" />
                  <p className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed">
                    Same dynamic tags supported as WhatsApp template.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex justify-end gap-4 items-center">
            {isSaved && (
              <span className="text-emerald-400 text-sm font-bold flex items-center gap-2 animate-in fade-in zoom-in">
                <CheckCircle2 className="w-5 h-5" /> Saved
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-custom-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-custom-blue/20"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              {isSaving ? 'Syncing...' : 'Save Workflow Settings'}
            </button>
          </div>
        </form>
      </div>

      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center">
               <Phone className="w-5 h-5 text-slate-600" />
            </div>
            <div>
               <p className="text-sm font-bold text-white uppercase tracking-tight">Developer Note (V2 Automation)</p>
               <p className="text-xs text-slate-500 font-medium">Currently using Redirect Links (wa.me/mailto). No server-side API keys required.</p>
            </div>
         </div>
      </div>
    </div>
  );
}
