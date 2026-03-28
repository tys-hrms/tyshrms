import React, { useState } from 'react';
import { useRBAC } from '../../contexts/RBACContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, AppModule, PermissionScope } from '../../types';
import { Save, Check, Lock, Globe, MapPin, XCircle } from 'lucide-react';

export default function RBACMatrix() {
  const { session } = useAuth();
  const { permissions, updatePermission, can } = useRBAC();
  const [isSaved, setIsSaved] = useState(false);

  const currentUserRole = session.currentUser?.role || 'Worker';
  const isAdminSession = currentUserRole === 'Admin';

  const roles: UserRole[] = ['Admin', 'Manager', 'Worker'];
  const modules: AppModule[] = ['dashboard', 'users', 'products', 'assignments', 'attendance', 'leaves', 'settings', 'rbac', 'reports'];
  const actions: ('view' | 'create' | 'edit' | 'delete')[] = ['view', 'create', 'edit', 'delete'];

  const getScope = (role: UserRole, module: AppModule, action: 'view'|'create'|'edit'|'delete'): PermissionScope => {
    const perm = permissions.find(p => p.role === role && p.module === module);
    if (!perm) return 'none';
    switch (action) {
      case 'view': return perm.viewScope;
      case 'create': return perm.createScope;
      case 'edit': return perm.editScope;
      case 'delete': return perm.deleteScope;
    }
  };

  const handleToggle = (role: UserRole, module: AppModule, action: any, currentScope: PermissionScope) => {
    if (currentScope !== 'none') {
      updatePermission(role, module, action, 'none');
    } else {
      const isGlobalModule = ['products', 'settings', 'rbac'].includes(module);
      const newScope = (role === 'Admin' || isGlobalModule) ? 'global' : 'location';
      updatePermission(role, module, action, newScope);
    }
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">Module</th>
                {roles.map(role => (
                  <th key={role} className="px-6 py-4 text-xs font-semibold text-white tracking-wider border-l border-slate-800 text-center">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {modules.map(moduleName => (
                <tr key={moduleName} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-300 capitalize text-sm">
                    {moduleName}
                  </td>
                  {roles.map(role => (
                    <td key={role} className="px-6 py-4 border-l border-slate-800">
                      <div className="grid grid-cols-2 gap-2 max-w-[160px] mx-auto">
                        {actions.map(action => {
                          const scope = getScope(role, moduleName, action);
                          const hasPerm = scope !== 'none';
                          const isAdminRoleMapping = role === 'Admin';
                          const isDisabled = isAdminRoleMapping || !isAdminSession;
                          
                          return (
                            <label 
                              key={action} 
                              className={`flex items-center space-x-2 text-xs cursor-pointer ${isDisabled ? 'opacity-50' : 'hover:bg-slate-800'} p-1 rounded transition-colors`}
                            >
                              <input
                                type="checkbox"
                                checked={hasPerm}
                                disabled={isDisabled}
                                onChange={() => handleToggle(role, moduleName, action, scope)}
                                className={`rounded border-slate-700 bg-slate-900 focus:ring-custom-blue w-3.5 h-3.5 ${isDisabled ? 'cursor-not-allowed text-slate-500' : 'text-custom-blue cursor-pointer'}`}
                              />
                              <span className={`capitalize ${hasPerm ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>{action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

