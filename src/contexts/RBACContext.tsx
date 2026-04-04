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
    view_scope: 'global' as PermissionScope, create_scope: 'global' as PermissionScope, edit_scope: 'global' as PermissionScope, delete_scope: 'global' as PermissionScope,
    features: { biometric_allowed: true }
  })),
  // Manager — restricted location access
  { 
    role: 'Manager', module: 'dashboard', 
    view_scope: 'location', create_scope: 'none', edit_scope: 'none', delete_scope: 'none',
    features: { biometric_allowed: true }
  },
  { role: 'Manager', module: 'users', view_scope: 'location', create_scope: 'location', edit_scope: 'location', delete_scope: 'none' },
  { role: 'Manager', module: 'products', view_scope: 'global', create_scope: 'global', edit_scope: 'global', delete_scope: 'none' },
  { role: 'Manager', module: 'assignments', view_scope: 'location', create_scope: 'location', edit_scope: 'location', delete_scope: 'location' },
  { role: 'Manager', module: 'attendance', view_scope: 'location', create_scope: 'none', edit_scope: 'location', delete_scope: 'none' },
  { role: 'Manager', module: 'leaves', view_scope: 'location', create_scope: 'none', edit_scope: 'location', delete_scope: 'none' },
  { role: 'Manager', module: 'settings', view_scope: 'location', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Manager', module: 'rbac', view_scope: 'none', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Manager', module: 'reports', view_scope: 'location', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Manager', module: 'crm', view_scope: 'location', create_scope: 'location', edit_scope: 'location', delete_scope: 'none' },
  { role: 'Manager', module: 'payroll', view_scope: 'location', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },

  // Worker — own data only
  { 
    role: 'Worker', module: 'dashboard', 
    view_scope: 'location', create_scope: 'none', edit_scope: 'none', delete_scope: 'none',
    features: { biometric_allowed: true }
  },
  { role: 'Worker', module: 'users', view_scope: 'none', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Worker', module: 'products', view_scope: 'location', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Worker', module: 'assignments', view_scope: 'location', create_scope: 'none', edit_scope: 'location', delete_scope: 'none' },
  { role: 'Worker', module: 'attendance', view_scope: 'location', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Worker', module: 'leaves', view_scope: 'location', create_scope: 'location', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Worker', module: 'settings', view_scope: 'none', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Worker', module: 'rbac', view_scope: 'none', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Worker', module: 'reports', view_scope: 'none', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Worker', module: 'crm', view_scope: 'none', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
  { role: 'Worker', module: 'payroll', view_scope: 'none', create_scope: 'none', edit_scope: 'none', delete_scope: 'none' },
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
    if (!session?.tenant?.id) {
      setIsLoading(false);
      return;
    }

    const loadCloudRBAC = async () => {
      try {
        const cPermissions = await db.request('find', 'rbac_permissions', { 
          filter: { tenant_id: session.tenant!.id } 
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
  }, [session?.tenant?.id]);

  const can = (role: UserRole, module: AppModule, action: PermissionAction, targetLocationId?: string, userLocationId?: string): boolean => {
    // Admin always has module bypass
    if (role === 'Admin') return true;

    const perm = permissions.find(p => p.role === role && p.module === module);
    if (!perm) return false;
    
    let scope: PermissionScope = 'none';
    switch (action) {
      case 'view': scope = perm.view_scope; break;
      case 'create': scope = perm.create_scope; break;
      case 'edit': scope = perm.edit_scope; break;
      case 'delete': scope = perm.delete_scope; break;
    }

    if (scope === 'none') return false;
    if (scope === 'global') return true;
    if (!targetLocationId || !userLocationId) return true;
    return targetLocationId === userLocationId;
  };
  
  const hasFeature = (role: UserRole, feature: keyof NonNullable<RolePermission['features']>): boolean => {
    // For features, we check matrix even for Admins
    const defaultFeatures = {
      biometric_allowed: true,
      system_print_allowed: true,
      ai_assistant_allowed: true,
      calculator_allowed: true
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
          view_scope: action === 'view' ? value : p.view_scope,
          create_scope: action === 'create' ? value : p.create_scope,
          edit_scope: action === 'edit' ? value : p.edit_scope,
          delete_scope: action === 'delete' ? value : p.delete_scope,
        };
      });
      if (session?.tenant?.id) {
        const updated = next.find(p => p.role === role && p.module === module);
        if (updated) db.save('rbac_permissions', { ...updated, id: `${session.tenant.id}_${role}_${module}`, tenant_id: session.tenant.id });
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
      if (session?.tenant?.id) {
        next.filter(p => p.role === role).forEach(p => db.save('rbac_permissions', { ...p, id: `${session.tenant!.id}_${p.role}_${p.module}`, tenant_id: session.tenant!.id }));
      }
      return next;
    });
  };

  const saveAllToCloud = async () => {
    if (!session?.tenant?.id) return;
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
      view_scope: 'none', create_scope: 'none', edit_scope: 'none', delete_scope: 'none',
      features: {}
    }));
    setPermissions(prev => [...prev, ...newPerms]);
    if (session?.tenant?.id) db.saveMany('rbac_permissions', newPerms.map(p => ({ ...p, id: `${session.tenant!.id}_${p.role}_${p.module}`, tenant_id: session.tenant!.id })));
  };

  const deleteRole = (role: string) => {
    if (['Admin', 'Manager', 'Worker'].includes(role)) return;
    setPermissions(prev => prev.filter(p => p.role !== role));
  };

  const renameRole = (oldName: string, newName: string) => {
    if (['Admin', 'Manager', 'Worker'].includes(oldName)) return;
    setPermissions(prev => {
      const next = prev.map(p => p.role === oldName ? { ...p, role: newName as UserRole } : p);
      if (session?.tenant?.id) {
        next.filter(p => p.role === newName).forEach(p => db.save('rbac_permissions', { ...p, id: `${session.tenant!.id}_${p.role}_${p.module}`, tenant_id: session.tenant!.id }));
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
