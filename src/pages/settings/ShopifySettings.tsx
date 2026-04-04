import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Store, Key, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ShopifySettings() {
  const { settings, updateShopify } = useSettings();
  const [url, setUrl] = useState(settings.shopify.store_url);
  const [token, setToken] = useState(settings.shopify.access_token);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateShopify({ store_url: url, access_token: token });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Shopify Integration</h2>
        <p className="text-sm text-slate-400">
          Connect your Shopify store using the Admin API to sync products directly. Note: This requires the Supabase Edge Function to bypass CORS.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Store URL</label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="e.g. your-store.myshopify.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-custom-blue"
            />
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-300 mb-2">Admin API Access Token</label>
           <div className="relative">
             <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
             <input
               type="password"
               value={token}
               onChange={e => setToken(e.target.value)}
               placeholder="shpat_..."
               className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-custom-blue"
             />
           </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleSave}
            className="flex items-center px-6 py-2.5 bg-custom-blue hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
          >
            Save Credentials
          </button>
          {isSaved && (
            <span className="text-teal-400 text-sm font-medium flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Saved
            </span>
          )}
        </div>
      </div>

      <div className="bg-custom-blue/10 border border-custom-blue/20 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-custom-blue mb-2 flex items-center">
          <RefreshCw className="w-5 h-5 mr-2" />
          Manual Sync
        </h3>
        <p className="text-sm text-blue-200/70 mb-4">
          Fetch the latest products from Shopify. Depending on catalog size, this may take a moment.
        </p>
        <button className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors flex items-center disabled:opacity-50">
          <RefreshCw className="w-4 h-4 mr-2" /> Sync Now (Coming Soon)
        </button>
      </div>
    </div>
  );
}
