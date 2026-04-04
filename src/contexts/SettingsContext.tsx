import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, ShopifySettings, Shift, LeaveAutomationSettings, BrandingSettings } from '../types';
import { db } from '../lib/database';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_HOLIDAYS = [
  { date: '2024-01-26', label: 'Republic Day', isWorking: false },
  { date: '2024-08-15', label: 'Independence Day', isWorking: false },
  { date: '2024-10-02', label: 'Gandhi Jayanti', isWorking: false },
  { date: '2024-05-01', label: 'Labor Day', isWorking: false },
  { date: '2024-12-25', label: 'Christmas', isWorking: false },
];

const DEFAULT_SETTINGS: AppSettings = {
  tenant_id: '',
  shopify: { store_url: '', access_token: '', api_version: '2024-01', sync_enabled: false },
  leave_automation: { enabled: true, whatsapp_enabled: true, email_enabled: true, whatsapp_template: '', email_template: '' },
  workstations: [],
  locations: [],
  branding: { company_name: 'HRMSCore', logo_url: '', primary_color: '#2d7cf6', secondary_color: '#14b8a6', accent_color: '#f59e0b', theme_mode: 'light' },
  state: 'Maharashtra',
  payroll_settings: { 
    epf_enabled: true, 
    epf_rate: 12,
    esi_enabled: true, 
    esi_rate: 0.75,
    pt_enabled: true, 
    pt_threshold: 10000,
    pt_amount: 200,
    ot_multiplier: 1.5,
    gratuity_enabled: true,
    holiday_list: DEFAULT_HOLIDAYS,
    weekends: [0]
  }
};

interface SettingsContextType {
  settings: AppSettings;
  shifts: Shift[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  updateShopify: (data: Partial<ShopifySettings>) => Promise<void>;
  updateLeaveAutomation: (data: Partial<LeaveAutomationSettings>) => Promise<void>;
  updateWorkstations: (data: any[]) => Promise<void>;
  updateLocations: (data: any[]) => Promise<void>;
  updateBranding: (data: Partial<BrandingSettings>) => Promise<void>;
  syncShopifyProducts: () => Promise<{ success: boolean; count?: number; error?: string }>;
  addShift: (data: any) => void;
  updateShift: (id: string, data: any) => void;
  deleteShift: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tys_hrms_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session.tenant?.id) setSettings((p: any) => ({ ...p, tenant_id: session.tenant.id }));
      }
    } catch { /* ignore */ }
  }, []);

  const loadCloudSettings = async () => {
    if (!settings.tenant_id) return;
    try {
      const cSettings = await db.tenants.getSettings(settings.tenant_id);
      if (cSettings) setSettings((p: any) => ({ ...p, ...cSettings }));
      setLastSyncedAt(Date.now());
    } catch { /* ignore */ } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!settings.tenant_id) { setIsLoading(false); return; }
    loadCloudSettings();
  }, [settings.tenant_id]);

  const persistSettings = async (next: any) => {
    if (!next.tenant_id) return;
    setIsSyncing(true);
    try {
      await db.tenants.saveSettings(next.tenant_id, next);
      setLastSyncedAt(Date.now());
    } finally { setIsSyncing(false); }
  };

  const updateSettings = async (updates: any) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    await persistSettings(next);
  };

  const updateShopify = async (data: any) => {
    const next = { ...settings, shopify: { ...settings.shopify, ...data } };
    setSettings(next);
    await persistSettings(next);
  };

  const updateLeaveAutomation = async (data: any) => {
    const next = { ...settings, leave_automation: { ...settings.leave_automation, ...data } };
    setSettings(next);
    await persistSettings(next);
  };

  const updateWorkstations = async (data: any[]) => {
    const next = { ...settings, workstations: data };
    setSettings(next);
    await persistSettings(next);
  };

  const updateLocations = async (data: any[]) => {
    const next = { ...settings, locations: data };
    setSettings(next);
    await persistSettings(next);
  };

  const updateBranding = async (data: any) => {
    const next = { ...settings, branding: { ...settings.branding, ...data } };
    setSettings(next);
    await persistSettings(next);
  };

  const syncShopifyProducts = async () => ({ success: false, error: 'Not implemented' });

  const addShift = async (data: any) => {
    const shift: Shift = { ...data, id: generateId(), tenant_id: settings.tenant_id, created_at: new Date().toISOString() };
    setShifts(prev => [...prev, shift]);
    setIsSyncing(true);
    try { await db.save('shifts', shift); } finally { setIsSyncing(false); }
  };

  const updateShift = async (id: string, data: any) => {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    const target = shifts.find(s => s.id === id);
    if (target) {
      setIsSyncing(true);
      try { await db.save('shifts', { ...target, ...data }); } finally { setIsSyncing(false); }
    }
  };

  const deleteShift = async (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    setIsSyncing(true);
    try { await db.delete('shifts', id); } finally { setIsSyncing(false); }
  };


  return (
    <SettingsContext.Provider value={{
      settings, shifts, isLoading, isSyncing, lastSyncedAt,
      updateSettings, updateShopify, updateLeaveAutomation, updateWorkstations, updateLocations, updateBranding,
      syncShopifyProducts, addShift, updateShift, deleteShift
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
