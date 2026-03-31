import React, { useState } from 'react';
import { useRBAC } from '../../contexts/RBACContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, AppModule, PermissionScope } from '../../types';
import { Save, Check, Lock, Globe, MapPin, XCircle, ShieldCheck } from 'lucide-react';

export default function RBACMatrix() {
  const { session } = useAuth();
  const currentUserRole = session.currentUser?.role || 'Worker';
  const isAdminSession = currentUserRole === 'Admin';
  const { permissions, updatePermission, toggleFeature } = useRBAC();
  const [isSaved, setIsSaved] = useState(false);

  const roles: UserRole[] = ['Admin', 'Manager', 'Worker'];
  const modules: AppModule[] = ['dashboard', 'users', 'products', 'assignments', 'attendance', 'leaves', 'settings', 'rbac', 'reports'];
  const actions: ('view' | 'create' | 'edit' | 'delete')[] = ['view', 'create', 'edit', 'delete'];

  const isModuleEnabled = (role: UserRole, module: AppModule): boolean => {
    const perm = permissions.find(p => p.role === role && p.module === module);
    return perm ? perm.viewScope !== 'none' : false;
  };

  const isFeatureEnabled = (role: UserRole, feature: 'biometricAllowed'): boolean => {
    const perm = permissions.find(p => p.role === role);
    return perm?.features?.[feature] ?? false;
  };

  const handleModuleToggle = (role: UserRole, module: AppModule, isEnabled: boolean) => {
    const newScope = isEnabled ? 'none' : (role === 'Admin' ? 'global' : 'location');
    updatePermission(role, module, 'view', newScope);
    updatePermission(role, module, 'create', newScope);
    updatePermission(role, module, 'edit', newScope);
    updatePermission(role, module, 'delete', newScope);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="max-w-xl">
          <h2 className="text-xl font-bold text-white mb-2">Permission Matrix</h2>
          <p className="text-sm text-slate-400">
            Define granular access control across the entire workspace. Admins always have full administrative bypass. Changes map instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isAdminSession && (
            <div className="flex items-center text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <Lock className="w-3.5 h-3.5 mr-1.5" /> View Only Access
            </div>
          )}
          <button 
            onClick={handleSave}
            disabled={!isAdminSession}
            className={`flex items-center px-4 py-2 font-medium rounded-xl transition-colors ${
              isAdminSession 
                ? 'bg-custom-blue hover:bg-blue-600 text-white shadow-lg shadow-custom-blue/20' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isSaved ? <span className="flex items-center"><Check className="w-4 h-4 mr-2" /> Saved</span> : 'Save Matrix'}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-64">Core Module Access</th>
                {roles.map(role => (
                  <th key={role} className="px-6 py-4 text-xs font-semibold text-white tracking-wider border-l border-slate-800 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-custom-blue" />
                      {role}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {modules.map(moduleName => (
                <tr key={moduleName} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-300 capitalize text-sm">
                    {moduleName}
                  </td>
                  {roles.map(role => {
                    const isEnabled = isModuleEnabled(role, moduleName);
                    const isDisabled = role === 'Admin' || !isAdminSession;
                    return (
                      <td key={role} className="px-6 py-4 border-l border-slate-800 text-center">
                        <label className={`inline-flex items-center cursor-pointer ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              disabled={isDisabled}
                              onChange={() => handleModuleToggle(role, moduleName, isEnabled)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-custom-blue"></div>
                          </div>
                          <span className="ml-3 text-xs font-medium text-slate-400 group-hover:text-slate-200">
                            {isEnabled ? 'ON' : 'OFF'}
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Advanced Security Features Section */}
              <tr className="bg-slate-800/40">
                <th colSpan={4} className="px-6 py-3 text-xs font-bold text-custom-blue uppercase tracking-widest border-y border-slate-700">
                  Advanced Security Features
                </th>
              </tr>
              
              {/* Biometric Feature */}
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 group">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Biometric Login</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Identity Security</div>
                    </div>
                  </div>
                </td>
                {roles.map(role => {
                  const isEnabled = isFeatureEnabled(role, 'biometricAllowed');
                  const isDisabled = !isAdminSession;
                  return (
                    <td key={role} className="px-6 py-4 border-l border-slate-800 text-center">
                      <label className={`flex flex-col items-center gap-2 cursor-pointer ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={isDisabled}
                          onChange={(e) => toggleFeature(role, 'biometricAllowed', e.target.checked)}
                          className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-custom-blue focus:ring-custom-blue focus:ring-offset-slate-900"
                        />
                        <span className={`text-[10px] font-bold ${isEnabled ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {isEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

