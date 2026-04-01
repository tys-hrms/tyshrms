// src/lib/database.ts - Universal Database Adapter for HRMSCore

const API_ENDPOINT = '/api/mongo';

/**
 * Executes a request against the HRMSCore MongoDB serverless API.
 */
async function callMongoClient(action: string, collection: string, payload: any = {}): Promise<any> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, collection, ...payload }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Database request failed');
    return result;
  } catch (err: any) {
    console.error(`[DB Error ${action} on ${collection}]:`, err.message);
    return { error: err.message };
  }
}

/**
 * Universal Database Client
 * Handles MongoDB Atlas sync with multi-tenant isolation.
 */
export const db = {
  /** ── Generic Utilities ── */
  async getAll<T>(collection: string): Promise<T[]> {
    const res = await callMongoClient('find', collection);
    return res.documents || [];
  },

  async getSingle<T>(collection: string): Promise<T | undefined> {
    const documents = await this.getAll<T>(collection);
    return documents[0];
  },

  async save(collection: string, document: any) {
    if (!document.id) return;
    return callMongoClient('upsertOne', collection, {
      filter: { id: document.id },
      document
    });
  },

  async delete(collection: string, id: string) {
    return callMongoClient('deleteOne', collection, { filter: { id } });
  },

  /** ── Users ── */
  users: {
    find: (filter = {}) => callMongoClient('find', 'users', { filter }).then(r => r.documents || []),
    findOne: (filter: Record<string, unknown>) => callMongoClient('findOne', 'users', { filter }).then(r => r.document),
    insert: (document: Record<string, unknown>) => callMongoClient('insertOne', 'users', { document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient('updateOne', 'users', { filter, update }),
    delete: (filter: Record<string, unknown>) => callMongoClient('deleteOne', 'users', { filter }),
  },

  /** ── Products ── */
  products: {
    find: (filter = {}) => callMongoClient('find', 'products', { filter }).then(r => r.documents || []),
    insert: (document: Record<string, unknown>) => callMongoClient('insertOne', 'products', { document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient('updateOne', 'products', { filter, update }),
  },

  /** ── Assignments ── */
  assignments: {
    find: (filter = {}) => callMongoClient('find', 'assignments', { filter }).then(r => r.documents || []),
    insert: (document: Record<string, unknown>) => callMongoClient('insertOne', 'assignments', { document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient('updateOne', 'assignments', { filter, update }),
    delete: (filter: Record<string, unknown>) => callMongoClient('deleteOne', 'assignments', { filter }),
  },

  /** ── Attendance & Breaks ── */
  attendance: {
    find: (filter = {}) => callMongoClient('find', 'attendance', { filter }).then(r => r.documents || []),
    insert: (document: Record<string, unknown>) => callMongoClient('insertOne', 'attendance', { document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient('updateOne', 'attendance', { filter, update }),
  },

  /** ── Tenants ── */
  tenants: {
    find: (filter = {}) => callMongoClient('find', 'tenants', { filter }).then(r => r.documents || []),
    findOne: (filter: Record<string, unknown>) => callMongoClient('findOne', 'tenants', { filter }).then(r => r.document),
    insert: (document: Record<string, unknown>) => callMongoClient('insertOne', 'tenants', { document }),
    
    // SaaS Specific: Fetch all data for a specific tenantId
    findUsers: (tenantId: string) => callMongoClient('find', 'users', { filter: { tenantId } }).then(r => r.documents || []),
    findAttendance: (tenantId: string) => callMongoClient('find', 'attendance', { filter: { tenantId } }).then(r => r.documents || []),
    findBreaks: (tenantId: string) => callMongoClient('find', 'breaks', { filter: { tenantId } }).then(r => r.documents || []),
    
    // Branding & Settings per tenant
    getSettings: (tenantId: string) => callMongoClient('findOne', 'app_settings', { filter: { tenantId } }).then(r => r.document),
    saveSettings: (tenantId: string, settings: any) => callMongoClient('upsertOne', 'app_settings', { filter: { tenantId }, document: { ...settings, tenantId } }),
  },
};
