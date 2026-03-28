import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, AppModule, PermissionAction, RolePermission, PermissionScope } from '../types';

const STORAGE_KEY = 'tys_hrms_rbac_v3';

// Default permissions matrix using scopes
const DEFAULT_PERMISSIONS: RolePermission[] = [
  // Admin — full access to everything
  ...(['dashboard','users','products','assignments','attendance','leaves','settings','rbac','reports'] as AppModule[]).map(mod => ({
    role: 'Admin' as UserRole, module: mod,
    viewScope: 'global' as PermissionScope, createScope: 'global' as PermissionScope, editScope: 'global' as PermissionScope, deleteScope: 'global' as PermissionScope,
  })),
  // Manager — restricted location access
  { role: 'Manager', module: 'dashboard', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Manager', module: 'users', viewScope: 'location', createScope: 'location', editScope: 'location', deleteScope: 'none' },
  { role: 'Manager', module: 'products', viewScope: 'global', createScope: 'global', editScope: 'global', deleteScope: 'none' },
  { role: 'Manager', module: 'assignments', viewScope: 'location', createScope: 'location', editScope: 'location', deleteScope: 'location' },
  { role: 'Manager', module: 'attendance', viewScope: 'location', createScope: 'none', editScope: 'location', deleteScope: 'none' },
  { role: 'Manager', module: 'leaves', viewScope: 'location', createScope: 'none', editScope: 'location', deleteScope: 'none' },
  { role: 'Manager', module: 'settings', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Manager', module: 'rbac', viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Manager', module: 'reports', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },

  // Worker — own data only (conceptually 'location' limits them visually, but they are limited to self by backend queries)
  { role: 'Worker', module: 'dashboard', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Worker', module: 'users', viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Worker', module: 'products', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Worker', module: 'assignments', viewScope: 'location', createScope: 'none', editScope: 'location', deleteScope: 'none' },
  { role: 'Worker', module: 'attendance', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Worker', module: 'leaves', viewScope: 'location', createScope: 'location', editScope: 'none', deleteScope: 'none' },
  { role: 'Worker', module: 'settings', viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Worker', module: 'rbac', viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Worker', module: 'reports', viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none' },
];

interface RBACContextType {
  permissions: RolePermission[];
  can: (role: UserRole, module: AppModule, action: PermissionAction, targetLocationId?: string, userLocationId?: string) => boolean;
  updatePermission: (role: UserRole, module: AppModule, action: PermissionAction, value: PermissionScope) => void;
  resetToDefaults: () => void;
  getPermissionsForRole: (role: UserRole) => RolePermission[];
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<RolePermission[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_PERMISSIONS;
    } catch { return DEFAULT_PERMISSIONS; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
  }, [permissions]);

  const can = (role: UserRole, module: AppModule, action: PermissionAction, targetLocationId?: string, userLocationId?: string): boolean => {
    const perm = permissions.find(p => p.role === role && p.module === module);
    if (!perm) return false;
    
    let scope: PermissionScope = 'none';
    switch (action) {
      case 'view': scope = perm.viewScope; break;
      case 'create': scope = perm.createScope; break;
      case 'edit': scope = perm.editScope; break;
      case 'delete': scope = perm.deleteScope; break;
    }

    if (scope === 'none') return false;
    if (scope === 'global') return true;
    
    // scope === 'location'
    if (!targetLocationId || !userLocationId) {
      // General check (e.g. for showing a menu item)
      return true;
    }
    
    return targetLocationId === userLocationId;
  };

  const updatePermission = (role: UserRole, module: AppModule, action: PermissionAction, value: PermissionScope) => {
    setPermissions(prev => prev.map(p => {
      if (p.role !== role || p.module !== module) return p;
      return {
        ...p,
        viewScope: action === 'view' ? value : p.viewScope,
        createScope: action === 'create' ? value : p.createScope,
        editScope: action === 'edit' ? value : p.editScope,
        deleteScope: action === 'delete' ? value : p.deleteScope,
      };
    }));
  };

  const resetToDefaults = () => setPermissions(DEFAULT_PERMISSIONS);

  const getPermissionsForRole = (role: UserRole) => permissions.filter(p => p.role === role);

  return (
    <RBACContext.Provider value={{ permissions, can, updatePermission, resetToDefaults, getPermissionsForRole }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC(): RBACContextType {
  const ctx = useContext(RBACContext);
  if (!ctx) throw new Error('useRBAC must be used within RBACProvider');
  return ctx;
}
