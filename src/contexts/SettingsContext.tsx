import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, ShopifySettings, MongoSettings, Shift, LeaveAutomationSettings, BrandingSettings } from '../types';
import { db } from '../lib/database';
import { useAuth } from './AuthContext';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_HOLIDAYS = [
  { date: '2024-01-26', label: 'Republic Day', isWorking: false },
  { date: '2024-08-15', label: 'Independence Day', isWorking: false },
  { date: '2024-10-02', label: 'Gandhi Jayanti', isWorking: false },
  { date: '2024-05-01', label: 'May Day / Labor Day', isWorking: false },
  { date: '2024-12-25', label: 'Christmas', isWorking: false },
];

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
  },
  state: 'Maharashtra',
  payrollSettings: {
    epfEnabled: true,
    esiEnabled: true,
    ptEnabled: true,
    gratuityEnabled: true,
    holidayList: DEFAULT_HOLIDAYS
  }
};

const DEFAULT_SHIFTS: Shift[] = [];

interface SettingsContextType {
  settings: AppSettings;
  shifts: Shift[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  updateShopify: (data: Partial<ShopifySettings>) => Promise<void>;
  updateMongo: (data: Partial<MongoSettings>) => Promise<void>;
  updateLeaveAutomation: (data: Partial<LeaveAutomationSettings>) => Promise<void>;
  updateWorkstations: (data: AppSettings['workstations']) => Promise<void>;
  updateLocations: (data: AppSettings['locations']) => Promise<void>;
  updateBranding: (data: Partial<BrandingSettings>) => Promise<void>;
  syncShopifyProducts: () => Promise<{ success: boolean; count?: number; error?: string }>;
  addShift: (data: Omit<Shift, 'id' | 'createdAt'>) => void;
  updateShift: (id: string, data: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [shifts, setShifts] = useState<Shift[]>(DEFAULT_SHIFTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());

  useEffect(() => {
    if (session?.tenant?.id) {
       setSettings(prev => ({ ...prev, tenantId: session.tenant!.id }));
    }
  }, [session?.tenant?.id]);

  const loadCloudSettings = async () => {
    if (!settings.tenantId) return;
    try {
      const [cSettings, cShifts] = await Promise.all([
        db.tenants.getSettings(settings.tenantId),
        db.request('find', 'shifts', { filter: { tenantId: settings.tenantId } }).then(r => r.documents || []),
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
      setLastSyncedAt(Date.now());
    } catch (err) {
      console.warn('[SettingsSync] Silent load failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!settings.tenantId) {
      setIsLoading(false);
      return;
    }
    loadCloudSettings();
  }, [settings.tenantId]);

  useEffect(() => {
    if (!settings.tenantId || isSyncing) return;
    const interval = setInterval(loadCloudSettings, 1500);
    return () => clearInterval(interval);
  }, [settings.tenantId, isSyncing]);

  const persistSettings = async (next: AppSettings) => {
    if (!next.tenantId) return;
    setIsSyncing(true);
    try {
      await db.tenants.saveSettings(next.tenantId, next);
      setLastSyncedAt(Date.now());
    } catch (e) {
      console.error('[Persistence] Settings failed to push:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    await persistSettings(next);
  };

  const updateShopify = async (data: Partial<ShopifySettings>) => {
    const next = { ...settings, shopify: { ...settings.shopify, ...data } };
    setSettings(next);
    await persistSettings(next);
  };

  const updateMongo = async (data: Partial<MongoSettings>) => {
    const next = { ...settings, mongodb: { ...settings.mongodb, ...data } };
    setSettings(next);
    await persistSettings(next);
  };

  const updateLeaveAutomation = async (data: Partial<LeaveAutomationSettings>) => {
    const next = { ...settings, leaveAutomation: { ...settings.leaveAutomation, ...data } };
    setSettings(next);
    await persistSettings(next);
  };

  const updateWorkstations = async (data: AppSettings['workstations']) => {
    const next = { ...settings, workstations: data };
    setSettings(next);
    await persistSettings(next);
  };

  const updateLocations = async (data: AppSettings['locations']) => {
    const next = { ...settings, locations: data };
    setSettings(next);
    await persistSettings(next);
  };

  const updateBranding = async (data: Partial<BrandingSettings>) => {
    const next = { ...settings, branding: { ...settings.branding, ...data } };
    setSettings(next);
    await persistSettings(next);
  };

  const syncShopifyProducts = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    return { success: false, error: 'Shopify sync requires an edge function.' };
  };

  const addShift = async (data: Omit<Shift, 'id' | 'createdAt'>) => {
    const shift: Shift = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    setShifts(prev => [...prev, shift]);
    setIsSyncing(true);
    try {
      await db.save('shifts', shift);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateShift = async (id: string, data: Partial<Shift>) => {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    const target = shifts.find(s => s.id === id);
    if (target) {
      setIsSyncing(true);
      try {
        await db.save('shifts', { ...target, ...data });
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const deleteShift = async (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    setIsSyncing(true);
    try {
      await db.delete('shifts', id);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings, shifts, isLoading, isSyncing, lastSyncedAt,
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
