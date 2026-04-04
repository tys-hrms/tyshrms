import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  CRMLead, CRMOrder, CRMSettings, CRMLeadSource, 
  CRMOrderItem, CRMLeadStage, User 
} from '../types';
import { db } from '../lib/database';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

interface CRMContextType {
  leads: CRMLead[];
  orders: CRMOrder[];
  settings: CRMSettings;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number;
  createLead: (data: Partial<CRMLead>) => Promise<string>;
  updateLead: (id: string, updates: Partial<CRMLead>) => Promise<void>;
  assignLead: (leadId: string, repIds: string[]) => Promise<void>;
  convertToOrder: (leadId: string) => Promise<string>;
  updateSettings: (updates: Partial<CRMSettings>) => Promise<void>;
  refreshCRM: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const DEFAULT_CRM_SETTINGS: Omit<CRMSettings, 'tenant_id'> = {
  ticket_prefix: 'TKT',
  enable_smart_assignment: true,
  sla_config: {
    whatsapp: 30,
    instagram: 60,
    facebook: 60,
    linkedin: 240,
    youtube: 480,
    word_of_mouth: 1440,
    manual: 1440,
    other: 1440,
  },
  stages: [
    { id: 'lead_in', label: 'Lead In', color: '#3b82f6', order: 0 },
    { id: 'qualification', label: 'Qualification', color: '#8b5cf6', order: 1 },
    { id: 'negotiation', label: 'Negotiation', color: '#f59e0b', order: 2 },
    { id: 'fulfillment', label: 'Fulfillment', color: '#10b981', order: 3 },
  ],
  badges: [
    { label: 'High Priority', color: '#ef4444' },
    { label: 'GST Verified', color: '#10b981' },
    { label: 'SLA Breach', color: '#f97316' },
  ],
  escalation_user_ids: []
};

export function CRMProvider({ children }: { children: ReactNode }) {
  const { session, users, attendanceLogs } = useAuth();
  const { settings: globalSettings } = useSettings();
  
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [orders, setOrders] = useState<CRMOrder[]>([]);
  const [crmSettings, setCrmSettings] = useState<CRMSettings>({
    tenant_id: session.tenant?.id || '',
    ...DEFAULT_CRM_SETTINGS
  } as CRMSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());

  const tenantId = session.tenant?.id;

  const refreshCRM = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [leadsData, ordersData, settingsData] = await Promise.all([
        db.request('find', 'crm_leads', { filter: { tenant_id: tenantId } }),
        db.request('find', 'crm_orders', { filter: { tenant_id: tenantId } }),
        db.request('findOne', 'crm_settings', { filter: { tenant_id: tenantId } })
      ]);

      if (leadsData.documents) setLeads(leadsData.documents);
      if (ordersData.documents) setOrders(ordersData.documents);
      if (settingsData.document) setCrmSettings(settingsData.document);
      else {
        const initSettings = { ...DEFAULT_CRM_SETTINGS, tenant_id: tenantId };
        await db.save('crm_settings', initSettings);
        setCrmSettings(initSettings as CRMSettings);
      }
      setLastSyncedAt(Date.now());
    } catch (error) {
      console.warn('[Heartbeat-CRM] Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    refreshCRM();
  }, [refreshCRM]);

  useEffect(() => {
    if (!tenantId || isSyncing) return;
    const interval = setInterval(refreshCRM, 1500); 
    return () => clearInterval(interval);
  }, [tenantId, isSyncing, refreshCRM]);

  useEffect(() => {
    if (tenantId) {
      db.sync.fromLocal(tenantId).then(count => {
        if (count > 0) refreshCRM();
      });
    }
  }, [tenantId, refreshCRM]);

  const generateTicketNumber = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sequence = String(leads.length + 1).padStart(6, '0');
    return `${crmSettings.ticket_prefix}-${year}-${dateStr}-${sequence}`;
  }, [crmSettings.ticket_prefix, leads.length]);

  const determineAssignment = useCallback((): { primary_rep_id?: string, tagged_rep_ids: string[], assigned_manager_id?: string } => {
    if (!crmSettings.enable_smart_assignment) return { tagged_rep_ids: [] };
    const today = new Date().toISOString().split('T')[0];
    const clockedInUserIds = attendanceLogs.filter(log => log.date === today && log.clock_in && !log.clock_out).map(log => log.user_id);
    const activeUsers = users.filter(u => clockedInUserIds.includes(u.id));
    const activeReps = activeUsers.filter(u => u.role.toLowerCase().includes('sale') || u.role.toLowerCase().includes('worker'));
    const activeManagers = activeUsers.filter(u => u.role.toLowerCase().includes('manager'));
    const activeAdmins = activeUsers.filter(u => u.role.toLowerCase().includes('admin'));

    if (activeReps.length > 0) {
      const repLeadCounts = activeReps.map(rep => ({
        id: rep.id,
        count: leads.filter(l => l.primary_rep_id === rep.id && l.status === 'active').length
      })).sort((a, b) => a.count - b.count);
      return { primary_rep_id: repLeadCounts[0].id, tagged_rep_ids: [] };
    }
    if (activeManagers.length > 0) return { assigned_manager_id: activeManagers[0].id, tagged_rep_ids: [] };
    if (activeAdmins.length > 0) return { assigned_manager_id: activeAdmins[0].id, tagged_rep_ids: [] };
    return { tagged_rep_ids: [] };
  }, [crmSettings.enable_smart_assignment, attendanceLogs, users, leads]);

  const createLead = async (data: Partial<CRMLead>): Promise<string> => {
    if (!tenantId) throw new Error('Tenant context missing');

    const ticket_number = generateTicketNumber();
    const assignment = determineAssignment();
    const slaMinutes = crmSettings.sla_config[data.source || 'manual'] || 1440;
    const sla_breach_at = new Date(Date.now() + slaMinutes * 60000).toISOString();

    const newLead: CRMLead = {
      id: `${tenantId}_${Date.now()}`,
      ticket_number,
      tenant_id: tenantId,
      customer_name: data.customer_name || 'New Inquiry',
      phone: data.phone || '',
      source: data.source || 'manual',
      stage: crmSettings.stages[0].id,
      status: 'active',
      priority: data.priority || 'medium',
      items: [],
      transportation_charges: 0,
      total_value: 0,
      currency: 'INR',
      is_gst_compliant: data.is_gst_compliant || false,
      business_type: data.business_type || '',
      lead_temperature: data.lead_temperature || 'Warm',
      expected_timeline: data.expected_timeline || 'Immediate',
      client_category: data.client_category || 'B2C',
      ...assignment,
      ...data,
      tagged_rep_ids: Array.from(new Set([...(assignment.tagged_rep_ids || []), ...(data.tagged_rep_ids || [])])),
      is_breached: false,
      sla_breach_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLeads(prev => [...prev, newLead]);
    setIsSyncing(true);
    try {
      await db.save('crm_leads', newLead);
    } finally {
      setIsSyncing(false);
    }
    return newLead.id;
  };

  const updateLead = async (id: string, updates: Partial<CRMLead>) => {
    const now = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates, updated_at: now } : l));
    const target = leads.find(l => l.id === id);
    if (target) {
        setIsSyncing(true);
        try { await db.save('crm_leads', { ...target, ...updates, updated_at: now }); } finally { setIsSyncing(false); }
    }
  };

  const assignLead = async (leadId: string, repIds: string[]) => {
    await updateLead(leadId, { tagged_rep_ids: repIds });
  };

  const convertToOrder = async (leadId: string): Promise<string> => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    const now = new Date().toISOString();
    const newOrder: CRMOrder = {
      id: `ORD_${leadId}`,
      ticket_number: lead.ticket_number,
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      customer_id: lead.id,
      items: lead.items,
      total_value: lead.total_value,
      fulfillment_status: 'ordered',
      created_at: now
    };

    setOrders(prev => [...prev, newOrder]);
    const wonLead = { ...lead, status: 'won' as const, converted_order_id: newOrder.id, updated_at: now };
    setLeads(prev => prev.map(l => l.id === leadId ? wonLead : l));

    setIsSyncing(true);
    try {
        await Promise.all([
          db.save('crm_orders', newOrder),
          db.save('crm_leads', wonLead)
        ]);
    } finally {
        setIsSyncing(false);
    }
    return newOrder.id;
  };

  const updateSettings = async (updates: Partial<CRMSettings>) => {
    const next = { ...crmSettings, ...updates };
    setCrmSettings(next);
    setIsSyncing(true);
    try { await db.save('crm_settings', next); } finally { setIsSyncing(false); }
  };

  return (
    <CRMContext.Provider value={{ 
      leads, orders, settings: crmSettings, isLoading, isSyncing, lastSyncedAt,
      createLead, updateLead, assignLead, convertToOrder, updateSettings, refreshCRM 
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within CRMProvider');
  return context;
}
