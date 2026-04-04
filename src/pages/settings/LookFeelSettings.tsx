import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Palette, Moon, Sun, Monitor, Check, Image as ImageIcon, Globe, RefreshCw } from 'lucide-react';

export default function LookFeelSettings() {
  const { settings, updateBranding } = useSettings();
  const { branding } = settings;
  const [formData, setFormData] = useState(branding);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const applyTheme = (mode: 'light' | 'dark') => {
    const updated = { ...formData, theme_mode: mode };
    setFormData(updated);
    updateBranding(updated);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

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
    updateBranding(defaults);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Visual Mode Toggle */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-custom-blue/10 rounded-xl">
            <Monitor className="w-5 h-5 text-custom-blue" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">System Appearance</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => applyTheme('light')}
            className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${formData.theme_mode === 'light' ? 'bg-white border-custom-blue text-slate-900 shadow-xl shadow-custom-blue/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
          >
            <Sun className={`w-8 h-8 ${formData.theme_mode === 'light' ? 'text-amber-500' : ''}`} />
            <span className="text-xs font-black uppercase tracking-widest">Light Mode</span>
          </button>
          <button 
            onClick={() => applyTheme('dark')}
            className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${formData.theme_mode === 'dark' ? 'bg-slate-800 border-custom-blue text-white shadow-xl shadow-custom-blue/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
          >
            <Moon className={`w-8 h-8 ${formData.theme_mode === 'dark' ? 'text-amber-300' : ''}`} />
            <span className="text-xs font-black uppercase tracking-widest">Dark Mode</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 2. Color Palette */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
              <Palette className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Brand Palette</h3>
          </div>

          <div className="space-y-4">
            <ColorPicker 
              label="Primary Color" 
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

          <div className="mt-8 p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 flex justify-center gap-4">
            <div className="w-10 h-10 rounded-xl shadow-lg" style={{ backgroundColor: formData.primary_color }} />
            <div className="w-10 h-10 rounded-xl shadow-lg" style={{ backgroundColor: formData.secondary_color }} />
            <div className="w-10 h-10 rounded-xl shadow-lg" style={{ backgroundColor: formData.accent_color }} />
          </div>
        </div>

        {/* 3. Identity & Logo */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <Globe className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Identity</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Company Name</label>
              <input 
                type="text" 
                value={formData.company_name}
                onChange={e => setFormData({...formData, company_name: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-custom-blue outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Logo URL</label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={formData.logo_url || ''}
                  onChange={e => setFormData({...formData, logo_url: e.target.value})}
                  placeholder="https://company.com/logo.png"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white focus:border-custom-blue outline-none"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Persistence UI */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800">
        <button 
          onClick={resetToDefault}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Factory
        </button>

        <div className="flex items-center gap-4">
          {showSuccess && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold animate-pulse">
              <Check className="w-5 h-5" />
              Saved to Cloud
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-custom-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-custom-blue/20"
          >
            {isSaving ? 'Syncing...' : 'Save All Changes'}
          </button>
        </div>
      </div>

    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
      <div>
        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        <span className="text-[10px] font-mono text-slate-400">{value.toUpperCase()}</span>
      </div>
      <input 
        type="color" 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg overflow-hidden bg-transparent border-none cursor-pointer"
      />
    </div>
  );
}
