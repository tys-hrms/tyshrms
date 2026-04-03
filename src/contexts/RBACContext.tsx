import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, AppModule, PermissionAction, RolePermission, PermissionScope } from '../types';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';


// Default permissions matrix using scopes
const DEFAULT_PERMISSIONS: RolePermission[] = [
  // Admin — full access to everything
  ...(['dashboard','users','products','assignments','attendance','leaves','settings','rbac','reports','crm','payroll'] as AppModule[]).map(mod => ({
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
  { role: 'Manager', module: 'crm', viewScope: 'location', createScope: 'location', editScope: 'location', deleteScope: 'none' },
  { role: 'Manager', module: 'payroll', viewScope: 'location', createScope: 'none', editScope: 'none', deleteScope: 'none' },

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
  { role: 'Worker', module: 'crm', viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none' },
  { role: 'Worker', module: 'payroll', viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none' },
];

interface RBACContextType {
  permissions: RolePermission[];
  isLoading: boolean;
  isSaving: boolean;
  can: (role: UserRole, module: AppModule, action: PermissionAction, targetLocationId?: string, userLocationId?: string) => boolean;
  updatePermission: (role: UserRole, module: AppModule, action: PermissionAction, value: PermissionScope) => void;
  toggleFeature: (role: UserRole, feature: keyof NonNullable<RolePermission['features']>, value: boolean) => void;
  saveAllToCloud: () => Promise<void>;
  resetToDefaults: () => void;
  getPermissionsForRole: (role: UserRole) => RolePermission[];
  getAvailableRoles: () => string[];
  addRole: (role: string) => void;
  deleteRole: (role: string) => void;
  renameRole: (oldName: string, newName: string) => void;
  hasFeature: (role: UserRole, feature: keyof NonNullable<RolePermission['features']>) => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { session } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings.mongodb.isEnabled || !session?.tenant?.id) {
      if (!session?.tenant?.id) setIsLoading(false);
      return;
    }

    const loadCloudRBAC = async () => {
      try {
        const cPermissions = await db.request('find', 'rbac_permissions', { 
          filter: { tenantId: session.tenant!.id } 
        }).then(res => res.documents || []);
        
        if (cPermissions.length) {
          setPermissions(prev => {
            const merged = [...prev];
            cPermissions.forEach((cp: any) => {
              const idx = merged.findIndex(p => p.role === cp.role && p.module === cp.module);
              if (idx !== -1) merged[idx] = cp;
              else merged.push(cp);
            });
            return merged;
          });
        }
      } catch (e) {
        console.error('[CloudSync] Failed to load RBAC:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadCloudRBAC();
  }, [settings.mongodb.isEnabled, session?.tenant?.id]);

  const can = (role: UserRole, module: AppModule, action: PermissionAction, targetLocationId?: string, userLocationId?: string): boolean => {
    // Admin always has module bypass
    if (role === 'Admin') return true;

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
    if (!targetLocationId || !userLocationId) return true;
    return targetLocationId === userLocationId;
  };
  
  const hasFeature = (role: UserRole, feature: keyof NonNullable<RolePermission['features']>): boolean => {
    // For features, we check matrix even for Admins
    const defaultFeatures = {
      biometricAllowed: true,
      systemPrintAllowed: true,
      aiAssistantAllowed: true,
      calculatorAllowed: true
    };
    const rolePermissions = permissions.filter(p => p.role === role);
    if (!rolePermissions.length) return defaultFeatures[feature] ?? false;
    return rolePermissions.some(p => p.features?.[feature] === true);
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
      if (settings.mongodb.isEnabled && session?.tenant?.id) {
        const updated = next.find(p => p.role === role && p.module === module);
        if (updated) db.save('rbac_permissions', { ...updated, id: `${session.tenant.id}_${role}_${module}`, tenantId: session.tenant.id });
      }
      return next;
    });
  };

  const toggleFeature = (role: UserRole, feature: keyof NonNullable<RolePermission['features']>, value: boolean) => {
    setPermissions(prev => {
      const next = prev.map(p => {
        if (p.role !== role) return p;
        return { ...p, features: { ...p.features, [feature]: value } };
      });
      if (settings.mongodb.isEnabled) {
        next.filter(p => p.role === role).forEach(p => db.save('rbac_permissions', { ...p, id: `${p.role}_${p.module}` }));
      }
      return next;
    });
  };

  const saveAllToCloud = async () => {
    if (!settings.mongodb.isEnabled) return;
    setIsSaving(true);
    try {
      await Promise.all(permissions.map(p => db.save('rbac_permissions', { ...p, id: `${p.role}_${p.module}` })));
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => setPermissions(DEFAULT_PERMISSIONS);
  const getPermissionsForRole = (role: UserRole) => permissions.filter(p => p.role === role);
  const getAvailableRoles = () => Array.from(new Set(['Admin', 'Manager', 'Worker', ...permissions.map(p => p.role)]));

  const addRole = (roleName: string) => {
    if (getAvailableRoles().includes(roleName)) return;
    const newPerms: RolePermission[] = ['dashboard','users','products','assignments','attendance','leaves','settings','rbac','reports','crm','payroll'].map(mod => ({
      role: roleName as UserRole, module: mod as AppModule,
      viewScope: 'none', createScope: 'none', editScope: 'none', deleteScope: 'none',
      features: {}
    }));
    setPermissions(prev => [...prev, ...newPerms]);
    if (settings.mongodb.isEnabled) db.saveMany('rbac_permissions', newPerms.map(p => ({ ...p, id: `${p.role}_${p.module}` })));
  };

  const deleteRole = (role: string) => {
    if (['Admin', 'Manager', 'Worker'].includes(role)) return;
    setPermissions(prev => prev.filter(p => p.role !== role));
  };

  const renameRole = (oldName: string, newName: string) => {
    if (['Admin', 'Manager', 'Worker'].includes(oldName)) return;
    setPermissions(prev => {
      const next = prev.map(p => p.role === oldName ? { ...p, role: newName as UserRole } : p);
      if (settings.mongodb.isEnabled) {
        next.filter(p => p.role === newName).forEach(p => db.save('rbac_permissions', { ...p, id: `${p.role}_${p.module}` }));
      }
      return next;
    });
  };

  return (
    <RBACContext.Provider value={{ 
      permissions, isLoading, isSaving, can, updatePermission, toggleFeature, 
      saveAllToCloud, resetToDefaults, getPermissionsForRole, getAvailableRoles, 
      addRole, deleteRole, renameRole, hasFeature 
    }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const ctx = useContext(RBACContext);
  if (!ctx) throw new Error('useRBAC must be used within RBACProvider');
  return ctx;
}
