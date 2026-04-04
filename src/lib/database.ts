import { supabaseRequest } from './supabaseClient';

export const db = {
  /** ── Generic Utilities ── */
  async getAll<T>(table: string): Promise<T[]> {
    return supabaseRequest(table, 'GET');
  },

  async getSingle<T>(table: string, id: string): Promise<T | undefined> {
    const res = await supabaseRequest(table, 'GET', { id: `eq.${id}`, select: '*' });
    return res[0];
  },

  async save(table: string, document: any) {
    if (!document.id) return;
    // UPSERT logic in Supabase REST: POST with Resolution=merge-duplicates or similar
    // Standard Supabase REST API upsert uses 'Prefer: resolution=merge-duplicates'
    const headers = { 'Prefer': 'resolution=merge-duplicates' };
    return supabaseRequest(table, 'POST', {}, document);
  },

  async saveMany(table: string, documents: any[]) {
    if (!documents?.length) return;
    return supabaseRequest(table, 'POST', {}, documents);
  },

  async delete(table: string, id: string) {
    return supabaseRequest(table, 'DELETE', { id: `eq.${id}` });
  },

  async request(action: string, table: string, payload: any = {}) {
     // Unified request for custom actions
     // For now, mapping standard mongo-like actions to SQL
     if (action === 'find') return { documents: await supabaseRequest(table, 'GET', payload.filter || {}) };
     if (action === 'insertOne') return supabaseRequest(table, 'POST', {}, payload.document);
     if (action === 'insertMany') return supabaseRequest(table, 'POST', {}, payload.documents);
     return { error: 'Action mapping not implemented for SQL yet' };
  },

  /** ── Users ── */
  users: {
    find: (filter = {}) => supabaseRequest('users', 'GET', filter),
    findOne: (filter: Record<string, unknown>) => {
        const query: Record<string, string> = {};
        Object.entries(filter).forEach(([k, v]) => { query[k] = `eq.${v}`; });
        return supabaseRequest('users', 'GET', query).then(res => res[0]);
    },
    insert: (document: any) => supabaseRequest('users', 'POST', {}, document),
    update: (filter: Record<string, unknown>, updateValue: any) => {
        const query: Record<string, string> = {};
        Object.entries(filter).forEach(([k, v]) => { query[k] = `eq.${v}`; });
        return supabaseRequest('users', 'PATCH', query, updateValue);
    },
    delete: (filter: Record<string, unknown>) => {
        const query: Record<string, string> = {};
        Object.entries(filter).forEach(([k, v]) => { query[k] = `eq.${v}`; });
        return supabaseRequest('users', 'DELETE', query);
    },
  },

  /** ── Products ── */
  products: {
    find: (filter = {}) => supabaseRequest('products', 'GET', filter),
    insert: (document: any) => supabaseRequest('products', 'POST', {}, document),
    update: (filter: Record<string, unknown>, updateValue: any) => {
        const query: Record<string, string> = {};
        Object.entries(filter).forEach(([k, v]) => { query[k] = `eq.${v}`; });
        return supabaseRequest('products', 'PATCH', query, updateValue);
    },
  },

  /** ── Assignments ── */
  assignments: {
    find: (filter = {}) => supabaseRequest('assignments', 'GET', filter),
    insert: (document: any) => supabaseRequest('assignments', 'POST', {}, document),
    update: (filter: Record<string, unknown>, updateValue: any) => {
        const query: Record<string, string> = {};
        Object.entries(filter).forEach(([k, v]) => { query[k] = `eq.${v}`; });
        return supabaseRequest('assignments', 'PATCH', query, updateValue);
    },
    delete: (filter: Record<string, unknown>) => {
        const query: Record<string, string> = {};
        Object.entries(filter).forEach(([k, v]) => { query[k] = `eq.${v}`; });
        return supabaseRequest('assignments', 'DELETE', query);
    },
  },

  /** ── Attendance & Breaks ── */
  attendance: {
    find: (filter = {}) => supabaseRequest('attendance_logs', 'GET', filter),
    insert: (document: any) => supabaseRequest('attendance_logs', 'POST', {}, document),
    update: (filter: Record<string, unknown>, updateValue: any) => {
        const query: Record<string, string> = {};
        Object.entries(filter).forEach(([k, v]) => { query[k] = `eq.${v}`; });
        return supabaseRequest('attendance_logs', 'PATCH', query, updateValue);
    },
  },

  /** ── Tenants ── */
  tenants: {
    find: (filter = {}) => supabaseRequest('tenants', 'GET', filter),
    findOne: (filter: Record<string, unknown>) => {
        const query: Record<string, string> = {};
        Object.entries(filter).forEach(([k, v]) => { query[k] = `eq.${v}`; });
        return supabaseRequest('tenants', 'GET', query).then(res => res[0]);
    },
    insert: (document: any) => supabaseRequest('tenants', 'POST', {}, document),
    
    findUsers: (tenant_id: string) => supabaseRequest('users', 'GET', { tenant_id: `eq.${tenant_id}` }),
    findAttendance: (tenant_id: string) => supabaseRequest('attendance_logs', 'GET', { tenant_id: `eq.${tenant_id}` }),
    findBreaks: (tenant_id: string) => supabaseRequest('break_logs', 'GET', { tenant_id: `eq.${tenant_id}` }),
    
    getSettings: (tenant_id: string) => supabaseRequest('tenants', 'GET', { id: `eq.${tenant_id}`, select: 'payroll_settings,branding' }).then(res => res[0]),
    saveSettings: (tenant_id: string, settings: any) => supabaseRequest('tenants', 'PATCH', { id: `eq.${tenant_id}` }, settings),
  },

  /** ── Synchronization Engine ── */
  sync: {
    async fromLocal(tenant_id: string) {
       // Keep existing logic but route to Supabase
       console.log('[Sync] Ready for SQL migration...');
       return 0; // Simplified for now
    }
  }
};
