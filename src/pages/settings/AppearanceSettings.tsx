import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Moon, Sun, Monitor, Check } from 'lucide-react';

export default function AppearanceSettings() {
  const { settings, updateBranding } = useSettings();
  const { branding } = settings;
  const [formData, setFormData] = useState(branding);
  const [showSuccess, setShowSuccess] = useState(false);

  const applyTheme = (mode: 'light' | 'dark') => {
    const updated = { ...formData, theme_mode: mode };
    setFormData(updated);
    updateBranding(updated);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-custom-blue/10 rounded-xl">
                    <Monitor className="w-5 h-5 text-custom-blue" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Display & Theme</h3>
            </div>
            {showSuccess && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold animate-pulse">
                    <Check className="w-5 h-5" />
                    Theme Saved
                </div>
            )}
         </div>

         <div className="grid grid-cols-2 gap-6">
            <button 
                onClick={() => applyTheme('light')}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${formData.theme_mode === 'light' ? 'bg-white border-custom-blue text-slate-900 shadow-xl shadow-custom-blue/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
            >
                <Sun className={`w-8 h-8 ${formData.theme_mode === 'light' ? 'text-amber-500' : ''}`} />
                <span className="text-sm font-black uppercase tracking-widest">Light Mode</span>
            </button>
            <button 
                onClick={() => applyTheme('dark')}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${formData.theme_mode === 'dark' ? 'bg-slate-800 border-custom-blue text-white shadow-xl shadow-custom-blue/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
            >
                <Moon className={`w-8 h-8 ${formData.theme_mode === 'dark' ? 'text-amber-300' : ''}`} />
                <span className="text-sm font-black uppercase tracking-widest">Dark Mode</span>
            </button>
         </div>
      </div>
    </div>
  );
}
