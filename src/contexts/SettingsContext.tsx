import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, ShopifySettings, MongoSettings, Shift, LeaveAutomationSettings, BrandingSettings } from '../types';
import { db } from '../lib/database';

const STORAGE_KEY = 'tys_hrms_settings_v2';
const STORAGE_KEY_SHIFTS = 'tys_hrms_shifts_v2';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_SETTINGS: AppSettings = {
  tenantId: '',
  shopify: {
    storeUrl: '',
    accessToken: '',
    apiVersion: '2024-01',
    syncEnabled: false,
  },
  mongodb: {
    appId: '',
    apiKey: '',
    dataSource: 'mongodb-atlas',
    database: 'hrmscore_saas',
    isEnabled: true,
  },
  leaveAutomation: {
    enabled: true,
    whatsappEnabled: true,
    emailEnabled: true,
    whatsappTemplate: 'Hello {worker_name},\n\nYour leave request for {start_date} to {end_date} has been {status} by {reviewer_name}.\n\nReason: {reason}\n\nRegards,\nHRMSCore Operations',
    emailTemplate: 'Hello {worker_name},\n\nYour leave request for {start_date} to {end_date} has been {status} by {reviewer_name}.\n\nReason: {reason}\n\nRegards,\nHRMSCore Operations',
  },
  workstations: [],
  locations: [],
  branding: {
    companyName: 'HRMSCore',
    primaryColor: '#2d7cf6',
    secondaryColor: '#14b8a6',
    accentColor: '#f59e0b',
    themeMode: 'dark',
  }
};

const DEFAULT_SHIFTS: Shift[] = [];

interface SettingsContextType {
  settings: AppSettings;
  shifts: Shift[];
  isLoading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateShopify: (data: Partial<ShopifySettings>) => void;
  updateMongo: (data: Partial<MongoSettings>) => void;
  updateLeaveAutomation: (data: Partial<LeaveAutomationSettings>) => void;
  updateWorkstations: (data: AppSettings['workstations']) => void;
  updateLocations: (data: AppSettings['locations']) => void;
  updateBranding: (data: Partial<BrandingSettings>) => void;
  syncShopifyProducts: () => Promise<{ success: boolean; count?: number; error?: string }>;
  addShift: (data: Omit<Shift, 'id' | 'createdAt'>) => void;
  updateShift: (id: string, data: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        shopify: { ...DEFAULT_SETTINGS.shopify, ...parsed.shopify },
        mongodb: { ...DEFAULT_SETTINGS.mongodb, ...parsed.mongodb || {} },
        leaveAutomation: { ...DEFAULT_SETTINGS.leaveAutomation, ...parsed.leaveAutomation || {} },
        branding: { ...DEFAULT_SETTINGS.branding, ...parsed.branding || {} },
      };
    } catch { return DEFAULT_SETTINGS; }
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SHIFTS);
      return stored ? JSON.parse(stored) : DEFAULT_SHIFTS;
    } catch { return DEFAULT_SHIFTS; }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts)); }, [shifts]);

  // --- Cloud Initialization (Tenant Scoped) ---
  useEffect(() => {
    if (!settings.tenantId) {
      setIsLoading(false);
      return;
    }

    const loadCloudSettings = async () => {
      setIsLoading(true);
      try {
        const [cSettings, cShifts] = await Promise.all([
          db.tenants.getSettings(settings.tenantId),
          db.getAll<Shift>('shifts') // Shifts are currently global, but could be scoped too
        ]);

        if (cSettings) {
          setSettings(prev => ({ 
            ...prev, 
            ...cSettings,
            shopify: { ...prev.shopify, ...cSettings.shopify },
            mongodb: { ...prev.mongodb, ...cSettings.mongodb },
            branding: { ...prev.branding, ...cSettings.branding || {} }
          }));
        }
        if (cShifts.length) setShifts(cShifts);
      } catch (err) {
        console.error('[SettingsSync] Failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCloudSettings();
  }, [settings.tenantId]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      if (next.tenantId) {
        db.tenants.saveSettings(next.tenantId, next);
      }
      return next;
    });
  };

  const updateShopify = (data: Partial<ShopifySettings>) => {
    setSettings(prev => {
      const next = { ...prev, shopify: { ...prev.shopify, ...data } };
      if (next.tenantId) db.tenants.saveSettings(next.tenantId, next);
      return next;
    });
  };

  const updateMongo = (data: Partial<MongoSettings>) => {
    setSettings(prev => {
      const next = { ...prev, mongodb: { ...prev.mongodb, ...data } };
      if (next.tenantId) db.tenants.saveSettings(next.tenantId, next);
      return next;
    });
  };

  const updateLeaveAutomation = (data: Partial<LeaveAutomationSettings>) => {
    setSettings(prev => {
      const next = { ...prev, leaveAutomation: { ...prev.leaveAutomation, ...data } };
      if (next.tenantId) db.tenants.saveSettings(next.tenantId, next);
      return next;
    });
  };

  const updateWorkstations = (data: AppSettings['workstations']) => {
    setSettings(prev => {
      const next = { ...prev, workstations: data };
      if (next.tenantId) db.tenants.saveSettings(next.tenantId, next);
      return next;
    });
  };

  const updateLocations = (data: AppSettings['locations']) => {
    setSettings(prev => {
      const next = { ...prev, locations: data };
      if (next.tenantId) db.tenants.saveSettings(next.tenantId, next);
      return next;
    });
  };

  const updateBranding = (data: Partial<BrandingSettings>) => {
    setSettings(prev => {
      const next = { ...prev, branding: { ...prev.branding, ...data } };
      if (next.tenantId) db.tenants.saveSettings(next.tenantId, next);
      return next;
    });
  };

  const syncShopifyProducts = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    return { success: false, error: 'Shopify sync requires an edge function.' };
  };

  const addShift = (data: Omit<Shift, 'id' | 'createdAt'>) => {
    const shift: Shift = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    setShifts(prev => {
      const next = [...prev, shift];
      db.save('shifts', shift);
      return next;
    });
  };

  const updateShift = (id: string, data: Partial<Shift>) => {
    setShifts(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...data } : s);
      const updated = next.find(s => s.id === id);
      if (updated) db.save('shifts', updated);
      return next;
    });
  };

  const deleteShift = (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    db.delete('shifts', id);
  };

  return (
    <SettingsContext.Provider value={{
      settings, shifts, isLoading,
      updateSettings, updateShopify, updateMongo, updateLeaveAutomation, updateWorkstations, updateLocations, updateBranding,
      syncShopifyProducts,
      addShift, updateShift, deleteShift,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
