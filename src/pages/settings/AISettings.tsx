import React, { useState } from 'react';
import { Bot, Key, Check } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export default function AISettings() {
  const { settings, updateSettings } = useSettings();
  const isAdmin = true;
  
  const [apiKey, setApiKey] = useState(settings.openai_key || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle'|'testing'|'success'|'error'>('idle');

  const saveKey = () => {
    updateSettings({ openai_key: apiKey });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestStatus('testing');
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (res.ok) setTestStatus('success');
      else setTestStatus('error');
    } catch (err) {
      setTestStatus('error');
    }
    setIsTesting(false);
  };

  if (!isAdmin) {
    return <div className="text-slate-500 p-8">You do not have administrative access to configure AI API keys.</div>;
  }

  return (
    <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                    <Bot className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">AI Assistant Settings</h3>
                  <p className="text-xs text-slate-400 font-medium">Configure global AI credentials securely.</p>
                </div>
            </div>
            {showSuccess && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold animate-pulse">
                    <Check className="w-5 h-5" />
                    Key Saved Securely
                </div>
            )}
         </div>

         <div className="space-y-4">
            <div>
                 <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Key className="w-3 h-3" /> OpenAI API Key
                 </label>
                 <input 
                     type="password" 
                     value={apiKey}
                     onChange={e => setApiKey(e.target.value)}
                     placeholder="sk-..."
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all font-mono"
                 />
                 <p className="text-[10px] text-slate-500 mt-2 font-medium">
                   This API key empowers the AI Assistant module and is vaulted locally for administrative domains.
                 </p>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button 
                 onClick={testConnection}
                 disabled={!apiKey || isTesting}
                 className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-colors ${
                   testStatus === 'success' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                   testStatus === 'error' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                   'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
                 }`}
              >
                 {isTesting ? 'Verifying...' : testStatus === 'success' ? 'Connection Verified' : testStatus === 'error' ? 'Verification Failed' : 'Test Connection'}
              </button>
              <button 
                 onClick={saveKey}
                 className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                 Save Credentials
              </button>
            </div>
         </div>
      </div>
    </div>
  );
}
