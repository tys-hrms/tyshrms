import React, { useState } from 'react';
import { AlertOctagon, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { db } from '../../lib/database';
import { useAuth } from '../../contexts/AuthContext';

export default function DangerZone() {
  const { session, logout } = useAuth();
  const [confirmCode, setConfirmCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleFactoryReset = async () => {
    if (confirmCode !== 'RESET-CODE') {
      setError('Invalid confirmation code.');
      return;
    }

    if (!session.tenant) return;

    if (!window.confirm('CRITICAL: This will permanently erase ALL data for your organization. This cannot be undone. Are you absolutely sure?')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      // In a real multi-tenant app, we'd delete all records mapped to this tenantId
      const tenantId = session.tenant.id;
      
      const collections = [
        'users', 'products', 'assignments', 'worklogs', 'dispatches', 
        'leaves', 'tasks', 'attendance', 'breaks', 'carry_forwards', 
        'app_settings', 'defect_reasons', 'workflow_nodes', 'workflow_edges', 
        'notifications', 'challenges', 'rbac_permissions', 'shifts', 
        'crm_leads', 'crm_orders', 'crm_tickets', 'payroll_records', 
        'salary_records', 'inventory_logs'
      ];

      // Delete all records for this tenant across all collections
      await Promise.all(collections.map(col => db.request('deleteMany', col, { filter: { tenantId } })));
      
      // Finally delete the tenant itself
      await db.delete('tenants', tenantId);

      alert('Factory Reset Complete. Your organization data has been erased.');
      logout();
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to perform reset.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] pointer-events-none" />
        
        <div className="flex items-start gap-6 relative z-10">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <AlertOctagon className="w-8 h-8 text-rose-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Danger Zone: Factory Reset</h2>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
              This operation will permanently delete your organization, all employee records, attendance logs, 
              products, and payroll data. There is no recovery possible once initiated.
            </p>
          </div>
        </div>

        <div className="mt-10 max-w-md bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-rose-500 mb-2">
            <ShieldAlert className="w-4 h-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Verification Required</p>
          </div>
          
          <p className="text-xs text-slate-500 font-bold">Type <span className="text-white">RESET-CODE</span> below to enable the destruction sequence.</p>
          
          <input 
            type="text" 
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            placeholder="Enter confirmation code"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 outline-none transition-all placeholder:text-slate-700"
          />

          {error && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse">{error}</p>}

          <button
            onClick={handleFactoryReset}
            disabled={confirmCode !== 'RESET-CODE' || isDeleting}
            className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              confirmCode === 'RESET-CODE' && !isDeleting
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/20' 
                : 'bg-slate-900 text-slate-700 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Initiate Factory Reset
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
           <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">What happens to my subscription?</h4>
           <p className="text-xs text-slate-400">A factory reset only erases data. Your account status and configuration values in the identity section will remain until you manually delete the browser session.</p>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
           <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Can I export first?</h4>
           <p className="text-xs text-slate-400">Yes, we recommend exporting your Payroll (CSV) and Product lists before performing this action. Deletion is instantaneous on the cloud database.</p>
        </div>
      </div>
    </div>
  );
}
