import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, ShopifySettings, MongoSettings, Shift, LeaveAutomationSettings } from '../types';

const STORAGE_KEY = 'tys_hrms_settings_v2';
const STORAGE_KEY_SHIFTS = 'tys_hrms_shifts_v2';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_SETTINGS: AppSettings = {
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
    database: 'tys_hrms',
    isEnabled: true,
  },
  leaveAutomation: {
    enabled: true,
    whatsappEnabled: true,
    emailEnabled: true,
    whatsappTemplate: 'Hello {worker_name},\n\nYour leave request for {start_date} to {end_date} has been {status} by {reviewer_name}.\n\nReason: {reason}\n\nRegards,\nTYS Operations',
    emailTemplate: 'Hello {worker_name},\n\nYour leave request for {start_date} to {end_date} has been {status} by {reviewer_name}.\n\nReason: {reason}\n\nRegards,\nTYS Operations',
  },
  workstations: [],
  locations: [],
};

const DEFAULT_SHIFTS: Shift[] = [];

interface SettingsContextType {
  settings: AppSettings;
  shifts: Shift[];
  updateShopify: (data: Partial<ShopifySettings>) => void;
  updateMongo: (data: Partial<MongoSettings>) => void;
  updateLeaveAutomation: (data: Partial<LeaveAutomationSettings>) => void;
  updateWorkstations: (data: AppSettings['workstations']) => void;
  updateLocations: (data: AppSettings['locations']) => void;
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
        shopify: { ...DEFAULT_SETTINGS.shopify, ...parsed.shopify },
        mongodb: { ...DEFAULT_SETTINGS.mongodb, ...parsed.mongodb || {} },
        leaveAutomation: { ...DEFAULT_SETTINGS.leaveAutomation, ...parsed.leaveAutomation || {} },
        workstations: parsed.workstations || [],
        locations: parsed.locations || [],
      };
    } catch { return DEFAULT_SETTINGS; }
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SHIFTS);
      return stored ? JSON.parse(stored) : DEFAULT_SHIFTS;
    } catch { return DEFAULT_SHIFTS; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts)); }, [shifts]);

  // --- Auto-Purge Legacy Demo Data ---
  useEffect(() => {
    const demoLocIds = ['loc1', 'loc2', 'loc3'];
    const demoWsIds = ['ws1', 'ws2', 'ws3', 'ws4'];
    setSettings(prev => {
      const locations = prev.locations.filter(l => !demoLocIds.includes(l.id));
      const workstations = prev.workstations.filter(w => !demoWsIds.includes(w.id));
      if (locations.length !== prev.locations.length || workstations.length !== prev.workstations.length) {
        return { ...prev, locations, workstations };
      }
      return prev;
    });
  }, []);

  const updateShopify = (data: Partial<ShopifySettings>) => {
    setSettings(prev => ({ ...prev, shopify: { ...prev.shopify, ...data } }));
  };

  const updateMongo = (data: Partial<MongoSettings>) => {
    setSettings(prev => ({ ...prev, mongodb: { ...prev.mongodb, ...data } }));
  };

  const updateLeaveAutomation = (data: Partial<LeaveAutomationSettings>) => {
    setSettings(prev => ({ ...prev, leaveAutomation: { ...prev.leaveAutomation, ...data } }));
  };

  const updateWorkstations = (data: AppSettings['workstations']) => {
    setSettings(prev => ({ ...prev, workstations: data }));
  };

  const updateLocations = (data: AppSettings['locations']) => {
    setSettings(prev => ({ ...prev, locations: data }));
  };

  const syncShopifyProducts = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    return { success: false, error: 'Shopify sync requires an edge function.' };
  };

  const addShift = (data: Omit<Shift, 'id' | 'createdAt'>) => {
    const shift: Shift = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    setShifts(prev => [...prev, shift]);
  };

  const updateShift = (id: string, data: Partial<Shift>) => {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteShift = (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
  };

  return (
    <SettingsContext.Provider value={{
      settings, shifts,
      updateShopify, updateMongo, updateLeaveAutomation, updateWorkstations, updateLocations,
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
