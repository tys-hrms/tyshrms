import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, AppModule, PermissionAction, RolePermission, PermissionScope } from '../types';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';

const STORAGE_KEY = 'tys_hrms_rbac_v3';

// Default permissions matrix using scopes
const DEFAULT_PERMISSIONS: RolePermission[] = [
  // Admin — full access to everything
  ...(['dashboard','users','products','assignments','attendance','leaves','settings','rbac','reports'] as AppModule[]).map(mod => ({
    role: 'Admin' as UserRole, module: mod,
    viewScope: 'global' as PermissionScope, createScope: 'global' as PermissionScope, editScope: 'global' as PermissionScope, deleteScope: 'global' as PermissionScope,
    features: { biometricAllowed: true }
  })),
  // Manager — restricted location access
  { 
    role: 'Manager', module: 'dashboard', 
    viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none',
    features: { biometricAllowed: true }
  },
  { role: 'Manager', module: 'users', viewScope: 'location', createScope: 'location', editScope: 'location', deleteScope: 'none' },
  { role: 'Manager', module: 'products', viewScope: 'global', createScope: 'global', editScope: 'global', deleteScope: 'none' },
  { role: 'Manager', module: 'assignments', viewScope: 'location', createScope: 'location', editScope: 'location', deleteScope: 'location' },
  { role: 'Manager', module: 'attendance', viewScope: 'location', createScope: 'none', editScope: 'location', deleteScope: 'none' },
  { role: 'Manager', module: 'leaves', viewScope: 'location', createScope: 'none', editScope: 'location', deleteScope: 'none' },
  { role: 'Manager', module: 'settings', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Manager', module: 'rbac', viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Manager', module: 'reports', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },

  // Worker — own data only
  { 
    role: 'Worker', module: 'dashboard', 
    viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none',
    features: { biometricAllowed: true }
  },
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
  isLoading: boolean;
  can: (role: UserRole, module: AppModule, action: PermissionAction, targetLocationId?: string, userLocationId?: string) => boolean;
  updatePermission: (role: UserRole, module: AppModule, action: PermissionAction, value: PermissionScope) => void;
  toggleFeature: (role: UserRole, feature: 'biometricAllowed', value: boolean) => void;
  resetToDefaults: () => void;
  getPermissionsForRole: (role: UserRole) => RolePermission[];
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [permissions, setPermissions] = useState<RolePermission[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_PERMISSIONS;
    } catch { return DEFAULT_PERMISSIONS; }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
  }, [permissions]);

  // --- Cloud Sync: Initial Load ---
  useEffect(() => {
    if (!settings.mongodb.isEnabled) {
      setIsLoading(false);
      return;
    }

    const loadCloudRBAC = async () => {
      console.log('[CloudSync] Loading RBAC matrix from MongoDB...');
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 5000);

      try {
        const cPermissions = await db.getAll<RolePermission>('rbac_permissions');
        if (cPermissions.length) setPermissions(cPermissions);
      } catch (e) {
        console.error('[CloudSync] Failed to load RBAC from cloud:', e);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    };

    loadCloudRBAC();
  }, [settings.mongodb.isEnabled]);

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
    setPermissions(prev => {
      const next = prev.map(p => {
        if (p.role !== role || p.module !== module) return p;
        return {
          ...p,
          viewScope: action === 'view' ? value : p.viewScope,
          createScope: action === 'create' ? value : p.createScope,
          editScope: action === 'edit' ? value : p.editScope,
          deleteScope: action === 'delete' ? value : p.deleteScope,
        };
      });
      if (settings.mongodb.isEnabled) {
        const updated = next.find(p => p.role === role && p.module === module);
        if (updated) db.save('rbac_permissions', { ...updated, id: `${role}_${module}` });
      }
      return next;
    });
  };

  const toggleFeature = (role: UserRole, feature: 'biometricAllowed', value: boolean) => {
    setPermissions(prev => {
      const next = prev.map(p => {
        if (p.role !== role) return p;
        return {
          ...p,
          features: {
            ...p.features,
            [feature]: value
          }
        };
      });
      
      if (settings.mongodb.isEnabled) {
        // Since features are copied across all permissions of a role, 
        // we must save ALL permissions for this role to cloud.
        const rolePermissions = next.filter(p => p.role === role);
        db.saveMany('rbac_permissions', rolePermissions.map(p => ({ ...p, id: `${p.role}_${p.module}` })));
      }
      
      return next;
    });
  };

  const resetToDefaults = () => setPermissions(DEFAULT_PERMISSIONS);

  const getPermissionsForRole = (role: UserRole) => permissions.filter(p => p.role === role);

  return (
    <RBACContext.Provider value={{ permissions, isLoading, can, updatePermission, toggleFeature, resetToDefaults, getPermissionsForRole }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC(): RBACContextType {
  const ctx = useContext(RBACContext);
  if (!ctx) throw new Error('useRBAC must be used within RBACProvider');
  return ctx;
}
