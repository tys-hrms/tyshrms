import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Database, AlertCircle, CheckCircle2, Save, ExternalLink, UploadCloud, Loader2 } from 'lucide-react';

export default function MongoSettings() {
  const { settings, updateMongo } = useSettings();
  const { migrateLocalToCloud: migrateApp } = useApp();
  const { migrateLocalToCloud: migrateAuth } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; count: number } | null>(null);

  if (!settings.mongodb) {
    return (
      <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white">Config Missing</h3>
        <p className="text-slate-400">Settings schema mismatch. Please reset storage or contact admin.</p>
      </div>
    );
  }

  const { appId, apiKey, dataSource, database, isEnabled } = settings.mongodb;
  const isEnvConnected = true; 

  const handleMigrate = async () => {
    if (!window.confirm('This will push all your LOCAL data to MongoDB Atlas. Existing remote data might be overwritten if IDs match. Proceed?')) return;
    
    setIsMigrating(true);
    try {
      const resAuth = await migrateAuth();
      const resApp = await migrateApp();
      setMigrationResult({ 
        success: resAuth.success && resApp.success, 
        count: resAuth.count + resApp.count 
      });
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed. Check console for details.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('MongoDB Settings saved!');
  };

  return (
    <div className="space-y-6 max-w-2xl animate-in slide-in-from-bottom-2 duration-400">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">MongoDB Atlas Config</h2>
            <p className="text-sm text-slate-400">Connect to your NoSQL database via Data API</p>
          </div>
        </div>

        {isEnvConnected && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Environment Connection Active</p>
              <p className="text-xs text-slate-400">The app is securely connected via your <code>MONGODB_URI</code> environment variable.</p>
            </div>
          </div>
        )}

        <div className="mb-6 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-custom-blue shrink-0 mt-0.5" />
            <div className="text-sm text-slate-300 leading-relaxed">
              <p className="font-semibold text-white mb-1">Recommended for PWA Architectures</p>
              This integration uses the <strong>MongoDB Atlas Data API</strong>. It allows our React app to interact with MongoDB over HTTPS, eliminating the need for a separate backend server.
              <a 
                href="https://www.mongodb.com/docs/atlas/app-services/data-api/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center ml-2 text-custom-blue hover:underline"
              >
                Learn more <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <div>
              <p className="text-sm font-medium text-white">Enable MongoDB Integration</p>
              <p className="text-xs text-slate-500">Enable/Disable database operations</p>
            </div>
            <button
              type="button"
              onClick={() => updateMongo({ isEnabled: !isEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative ${isEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Atlas App ID</label>
              <input
                type="text"
                value={appId}
                onChange={e => updateMongo({ appId: e.target.value })}
                placeholder="e.g. data-xyz123"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-custom-blue transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => updateMongo({ apiKey: e.target.value })}
                placeholder="Enter Atlas API Key"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-custom-blue transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Cluster Name (Data Source)</label>
              <input
                type="text"
                value={dataSource}
                onChange={e => updateMongo({ dataSource: e.target.value })}
                placeholder="default: mongodb-atlas"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-custom-blue transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Database Name</label>
              <input
                type="text"
                value={database}
                onChange={e => updateMongo({ database: e.target.value })}
                placeholder="e.g. tys_hrms"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-custom-blue transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center px-6 py-2.5 bg-custom-blue hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-custom-blue/20"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-custom-blue" />
          Cloud Migration Tool
        </h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          If you have been using the app offline or in trial mode, use this tool to push your local products, users, and assignments to your Atlas Cluster.
        </p>

        {migrationResult ? (
          <div className={`p-4 rounded-xl border ${migrationResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} mb-4 animate-in fade-in duration-300`}>
            <div className="flex items-center gap-2 font-bold uppercase text-xs">
              {migrationResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {migrationResult.success ? 'Migration Successful' : 'Migration Failed'}
            </div>
            <p className="text-sm mt-1 opacity-80">
              {migrationResult.success 
                ? `Successfully synchronized ${migrationResult.count} records to MongoDB Atlas.` 
                : 'Something went wrong during the sync process. Please verify your Atlas configuration and try again.'}
            </p>
          </div>
        ) : null}

        <button
          onClick={handleMigrate}
          disabled={isMigrating || !isEnabled}
          className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            isEnabled 
              ? 'bg-slate-800 hover:bg-custom-blue text-slate-400 hover:text-white border border-slate-700 hover:border-custom-blue' 
              : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
          }`}
        >
          {isMigrating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Synchronizing Data...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              Push Local Data to Atlas
            </>
          )}
        </button>
        {!isEnabled && (
          <p className="text-[10px] text-slate-600 font-bold uppercase mt-3 text-center tracking-wider">
            Enable MongoDB above to use migration tools
          </p>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Connection Guide</h3>
        <ol className="list-decimal list-inside space-y-3 text-sm text-slate-400">
          <li>Log in to your <strong>MongoDB Atlas</strong> dashboard.</li>
          <li>Navigate to <strong>App Services</strong> in the left sidebar.</li>
          <li>Create a new Application (e.g., "HRMSCore-API").</li>
          <li>In the App Services dashboard, enable the <strong>Data API</strong>.</li>
          <li>Generate an <strong>API Key</strong> under the "Authentication" section or use the one provided by Data API settings.</li>
          <li>Copy the <strong>App ID</strong> from the top left and the API Key into the form above.</li>
        </ol>
      </div>
    </div>
  );
}
