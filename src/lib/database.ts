// src/lib/database.ts - Universal Database Adapter for HRMSCore

const API_ENDPOINT = '/api/mongo';

/**
 * Executes a request against the HRMSCore MongoDB serverless API.
 */
async function callMongoClient(action: string, collection: string, payload: any = {}): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    // Clean payload: Remove sensitive/frontend fields from document if it's an upsert/insert
    if (payload.document) {
        const { _id, mongoSynced, ...cleanDoc } = payload.document;
        payload.document = cleanDoc;
    }
    
    // Clean many documents
    if (payload.documents && Array.isArray(payload.documents)) {
        payload.documents = payload.documents.map((doc: any) => {
            const { _id, mongoSynced, ...clean } = doc;
            return clean;
        });
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, collection, ...payload }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            throw new Error(`Invalid API response: ${text.slice(0, 50)}...`);
        }
        
        if (!response.ok) {
            console.error(`[DB ERROR ${action} on ${collection}]:`, result.error || 'Request failed');
            throw new Error(result.error || `Database ${action} failed: ${response.statusText}`);
        }
        
        return result;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            const timeoutMsg = `Database timeout (${action} on ${collection}). This is usually an Atlas firewall or protocol error.`;
            console.error(timeoutMsg);
            throw new Error(timeoutMsg);
        }
        throw err;
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

  async saveMany(collection: string, documents: any[]) {
    if (!documents?.length) return;
    return callMongoClient('insertMany', collection, { documents });
  },

  async delete(collection: string, id: string) {
    return callMongoClient('deleteOne', collection, { filter: { id } });
  },

  async request(action: string, collection: string, payload: any = {}) {
    return callMongoClient(action, collection, payload);
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

  /** ── Synchronization Engine ── */
  sync: {
    async fromLocal(tenantId: string) {
      const keys = {
        'users': 'tys_hrms_users',
        'products': 'tys_hrms_products',
        'assignments': 'tys_hrms_assignments',
        'attendance': 'tys_hrms_attendance',
        'worklogs': 'tys_hrms_worklogs',
        'crm_leads': 'tys_crm_leads',
        'crm_orders': 'tys_crm_orders'
      };

      let migratedCount = 0;
      for (const [collection, localKey] of Object.entries(keys)) {
        try {
          const stored = localStorage.getItem(localKey);
          if (stored) {
            const items = JSON.parse(stored);
            if (Array.isArray(items) && items.length > 0) {
              const withTenant = items.map(item => ({ ...item, tenantId }));
              const res = await callMongoClient('insertMany', collection, { documents: withTenant });
              if (!res.error) {
                localStorage.removeItem(localKey);
                migratedCount += items.length;
              }
            }
          }
        } catch (e) {
          console.error(`[Sync] Failed for ${collection}:`, e);
        }
      }
      return migratedCount;
    }
  }
};
