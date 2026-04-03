import React, { useState } from 'react';
import { useRBAC } from '../../contexts/RBACContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, AppModule, PermissionScope, RolePermission } from '../../types';
import { Save, Check, Lock, Globe, MapPin, XCircle, ShieldCheck, Plus, X, Trash2, Edit2 } from 'lucide-react';

export default function RBACMatrix() {
  const { session } = useAuth();
  const currentUserRole = session.currentUser?.role || 'Worker';
  const isAdminSession = currentUserRole === 'Admin';
  const { permissions, updatePermission, toggleFeature, saveAllToCloud, isSaving, getAvailableRoles, addRole, deleteRole } = useRBAC();
  const [isSaved, setIsSaved] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const handleSave = async () => {
    await saveAllToCloud();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const roles: UserRole[] = getAvailableRoles();
  const modules: AppModule[] = ['dashboard', 'users', 'products', 'assignments', 'attendance', 'leaves', 'settings', 'rbac', 'reports', 'crm'];
  const actions: ('view' | 'create' | 'edit' | 'delete')[] = ['view', 'create', 'edit', 'delete'];

  const isModuleEnabled = (role: UserRole, module: AppModule): boolean => {
    const perm = permissions.find(p => p.role === role && p.module === module);
    return perm ? perm.viewScope !== 'none' : false;
  };

  const isFeatureEnabled = (role: UserRole, feature: keyof NonNullable<RolePermission['features']>): boolean => {
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
          {isAdminSession && (
            <button 
              onClick={() => setIsAddingRole(true)}
              className="flex items-center px-4 py-2 font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2 text-custom-blue" /> Add User Type
            </button>
          )}
          <button 
            onClick={handleSave}
            disabled={!isAdminSession || isSaving}
            className={`flex items-center px-4 py-2 font-medium rounded-xl transition-colors ${
              isAdminSession 
                ? 'bg-custom-blue hover:bg-blue-600 text-white shadow-lg shadow-custom-blue/20 disabled:opacity-60' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isSaving 
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Saving...</span>
              : isSaved 
                ? <span className="flex items-center"><Check className="w-4 h-4 mr-2" /> Saved!</span> 
                : 'Save Matrix'
            }
          </button>
        </div>
      </div>

      {/* Add Role Modal */}
      {isAddingRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-bold text-white uppercase tracking-tight">Create New User Type</h3>
                 <button onClick={() => setIsAddingRole(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Role Name</label>
                    <input 
                       autoFocus
                       type="text" 
                       value={newRoleName}
                       onChange={e => setNewRoleName(e.target.value)}
                       placeholder="e.g. Supervisor, Auditor..."
                       className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:border-custom-blue outline-none transition-all font-bold placeholder:text-slate-700"
                    />
                    <p className="text-[10px] text-slate-500 mt-2 italic">New roles start with 'Worker' permissions by default.</p>
                 </div>
                 <div className="flex items-center gap-3 pt-4">
                    <button 
                       onClick={() => setIsAddingRole(false)}
                       className="flex-1 px-4 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 rounded-2xl transition-colors"
                    >
                       Cancel
                    </button>
                    <button 
                       disabled={!newRoleName.trim()}
                       onClick={() => {
                          addRole(newRoleName.trim());
                          setNewRoleName('');
                          setIsAddingRole(false);
                       }}
                       className="flex-1 px-4 py-3 text-sm font-bold bg-custom-blue hover:bg-blue-600 text-white rounded-2xl shadow-lg shadow-custom-blue/20 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                       Create Type
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}


      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-64">Core Module Access</th>
                {roles.map(role => (
                  <th key={role} className="px-6 py-4 text-xs font-semibold text-white tracking-wider border-l border-slate-800 text-center relative group/role">
                    <div className="flex flex-col items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-custom-blue" />
                      {role}
                    </div>
                    {isAdminSession && !['Admin', 'Manager', 'Worker'].includes(role) && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover/role:opacity-100 flex items-center gap-1 transition-all">
                        <button 
                          onClick={() => {
                            const newName = prompt(`Rename role "${role}" to:`, role);
                            if (newName && newName !== role) {
                              // We'll need a renameRole in context
                              // renameRole(role, newName);
                              console.log('Rename role to', newName); // Placeholder for now or I'll add it to context
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => { if (confirm(`Delete role "${role}"? All users with this role will lose access.`)) deleteRole(role); }}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
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
              {/* Tally Print Feature */}
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 group">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">System Printing & Exporting</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Report View Generator</div>
                    </div>
                  </div>
                </td>
                {roles.map(role => {
                  const isEnabled = isFeatureEnabled(role, 'systemPrintAllowed');
                  const isDisabled = !isAdminSession;
                  return (
                    <td key={role} className="px-6 py-4 border-l border-slate-800 text-center">
                      <label className={`flex flex-col items-center gap-2 cursor-pointer ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={isDisabled}
                          onChange={(e) => toggleFeature(role, 'systemPrintAllowed', e.target.checked)}
                          className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-custom-blue focus:ring-custom-blue focus:ring-offset-slate-900"
                        />
                        <span className={`text-[10px] font-bold ${isEnabled ? 'text-amber-400' : 'text-slate-600'}`}>
                          {isEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
              {/* Floating Calculator */}
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 group">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Floating OS Calculator</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Global Interaction</div>
                    </div>
                  </div>
                </td>
                {roles.map(role => {
                  const isEnabled = isFeatureEnabled(role, 'calculatorAllowed');
                  const isDisabled = !isAdminSession;
                  return (
                    <td key={role} className="px-6 py-4 border-l border-slate-800 text-center">
                      <label className={`flex flex-col items-center gap-2 cursor-pointer ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={isDisabled}
                          onChange={(e) => toggleFeature(role, 'calculatorAllowed', e.target.checked)}
                          className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-custom-blue focus:ring-custom-blue focus:ring-offset-slate-900"
                        />
                        <span className={`text-[10px] font-bold ${isEnabled ? 'text-purple-400' : 'text-slate-600'}`}>
                          {isEnabled ? 'AVAILABLE' : 'HIDDEN'}
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
              {/* AI Assistant Feature */}
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 group">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-custom-blue" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">AI Workspace Assistant</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">OpenAI Widget</div>
                    </div>
                  </div>
                </td>
                {roles.map(role => {
                  const isEnabled = isFeatureEnabled(role, 'aiAssistantAllowed');
                  const isDisabled = !isAdminSession;
                  return (
                    <td key={role} className="px-6 py-4 border-l border-slate-800 text-center">
                      <label className={`flex flex-col items-center gap-2 cursor-pointer ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={isDisabled}
                          onChange={(e) => toggleFeature(role, 'aiAssistantAllowed', e.target.checked)}
                          className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-custom-blue focus:ring-custom-blue focus:ring-offset-slate-900"
                        />
                        <span className={`text-[10px] font-bold ${isEnabled ? 'text-custom-blue' : 'text-slate-600'}`}>
                          {isEnabled ? 'AVAILABLE' : 'HIDDEN'}
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

