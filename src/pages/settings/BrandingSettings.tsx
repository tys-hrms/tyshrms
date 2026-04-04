import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Palette, Globe, Image as ImageIcon, Check, RefreshCw, Moon, Sun } from 'lucide-react';

export default function BrandingSettings() {
  const { settings, updateBranding } = useSettings();
  const { branding } = settings;
  
  const [formData, setFormData] = useState(branding);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      updateBranding(formData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    const defaults = {
      company_name: 'HRMSCore',
      logo_url: '',
      primary_color: '#2d7cf6',
      secondary_color: '#14b8a6',
      accent_color: '#f59e0b',
      theme_mode: 'dark' as const,
    };
    setFormData(defaults);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Basic info */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-custom-blue/10 rounded-xl">
                    <Globe className="w-5 h-5 text-custom-blue" />
                </div>
                <h3 className="text-lg font-bold text-white">Identity</h3>
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Company Name</label>
                    <input 
                        type="text" 
                        value={formData.company_name}
                        onChange={e => setFormData({...formData, company_name: e.target.value})}
                        placeholder="e.g. Acme Corp"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-custom-blue outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Logo URL</label>
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <ImageIcon className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text" 
                                value={formData.logo_url || ''}
                                onChange={e => setFormData({...formData, logo_url: e.target.value})}
                                placeholder="https://company.com/logo.png"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white focus:border-custom-blue outline-none transition-all"
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 italic">Use a high-quality transparent PNG for best results.</p>
                </div>
             </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-500/10 rounded-xl">
                    {formData.theme_mode === 'dark' ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                </div>
                <h3 className="text-lg font-bold text-white">Visual Mode</h3>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => setFormData({...formData, theme_mode: 'light'})}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${formData.theme_mode === 'light' ? 'bg-white border-white text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                    <Sun className="w-6 h-6" />
                    <span className="text-xs font-black uppercase tracking-widest">Light Mode</span>
                </button>
                <button 
                    onClick={() => setFormData({...formData, theme_mode: 'dark'})}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${formData.theme_mode === 'dark' ? 'bg-slate-800 border-custom-blue text-white shadow-lg shadow-custom-blue/10' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                    <Moon className="w-6 h-6" />
                    <span className="text-xs font-black uppercase tracking-widest">Dark Mode</span>
                </button>
             </div>
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl h-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                        <Palette className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Color Palette</h3>
                </div>

                <div className="space-y-6">
                    <ColorPicker 
                        label="Primary Brand Color" 
                        value={formData.primary_color} 
                        onChange={v => setFormData({...formData, primary_color: v})} 
                    />
                    <ColorPicker 
                        label="Secondary Color" 
                        value={formData.secondary_color} 
                        onChange={v => setFormData({...formData, secondary_color: v})} 
                    />
                    <ColorPicker 
                        label="Accent Highlight" 
                        value={formData.accent_color} 
                        onChange={v => setFormData({...formData, accent_color: v})} 
                    />
                </div>

                <div className="mt-12 p-6 rounded-3xl bg-slate-950 border border-dashed border-slate-800 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Preview of Palette</p>
                    <div className="flex justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl shadow-lg" style={{ backgroundColor: formData.primary_color }} title="Primary" />
                        <div className="w-12 h-12 rounded-2xl shadow-lg" style={{ backgroundColor: formData.secondary_color }} title="Secondary" />
                        <div className="w-12 h-12 rounded-2xl shadow-lg" style={{ backgroundColor: formData.accent_color }} title="Accent" />
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800">
        <button 
            onClick={resetToDefault}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest px-4 py-2"
        >
            <RefreshCw className="w-4 h-4" />
            Reset to Defaults
        </button>

        <div className="flex gap-4">
            {showSuccess && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold animate-in fade-in zoom-in">
                    <Check className="w-5 h-5" />
                    Theme Applied Globally
                </div>
            )}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 bg-custom-blue hover:bg-blue-600 disabled:bg-slate-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-custom-blue/20 transition-all active:scale-95"
            >
                {isSaving ? 'Syncing...' : 'Save Branding'}
            </button>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800 group hover:border-slate-700 transition-all">
            <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
                <code className="text-xs font-mono text-slate-400 mt-1 block">{value.toUpperCase()}</code>
            </div>
            <div className="relative group cursor-pointer">
                <input 
                    type="color" 
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-10 h-10 rounded-xl overflow-hidden bg-transparent border-none cursor-pointer"
                />
                <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-white/20 pointer-events-none transition-all" />
            </div>
        </div>
    );
}
