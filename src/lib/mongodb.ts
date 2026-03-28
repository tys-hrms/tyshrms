/**
 * TYS-HRMS MongoDB Client
 *
 * Calls the /api/mongo Vercel serverless function, which securely
 * connects to MongoDB Atlas using the official Node.js driver.
 *
 * Works in:
 *   - Local dev  → Vite proxy forwards /api/* to localhost:3000 (vercel dev)
 *   - Production → Vercel routes /api/* to serverless functions automatically
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type MongoAction =
  | 'find'
  | 'findOne'
  | 'insertOne'
  | 'insertMany'
  | 'updateOne'
  | 'updateMany'
  | 'upsertOne'
  | 'deleteOne'
  | 'deleteMany';

export interface QueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  projection?: Record<string, 0 | 1>;
}

export interface MongoRequest {
  action: MongoAction;
  collection: string;
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  documents?: Record<string, unknown>[];
  update?: Record<string, unknown>;
  options?: QueryOptions;
}

// ─── Core Client ─────────────────────────────────────────────────────────────

const API_ENDPOINT = '/api/mongo';

/**
 * Executes a request against the TYS-HRMS MongoDB serverless API.
 */
export async function callMongoClient(request: MongoRequest): Promise<any> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      errorMsg = err.error || errorMsg;
    } catch { /* ignore parse error */ }
    throw new Error(`[MongoDB] ${request.action} on "${request.collection}" failed: ${errorMsg}`);
  }

  return response.json();
}

// ─── Collection Helpers ───────────────────────────────────────────────────────
// Convenience wrappers for each collection used in TYS-HRMS.

export const db = {
  /** ── Users ── */
  users: {
    find: (filter = {}) => callMongoClient({ action: 'find', collection: 'users', filter }),
    findOne: (filter: Record<string, unknown>) => callMongoClient({ action: 'findOne', collection: 'users', filter }),
    insert: (document: Record<string, unknown>) => callMongoClient({ action: 'insertOne', collection: 'users', document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient({ action: 'updateOne', collection: 'users', filter, update }),
    upsert: (filter: Record<string, unknown>, document: Record<string, unknown>) => callMongoClient({ action: 'upsertOne', collection: 'users', filter, document }),
    delete: (filter: Record<string, unknown>) => callMongoClient({ action: 'deleteOne', collection: 'users', filter }),
  },

  /** ── Products ── */
  products: {
    find: (filter = {}, options?: QueryOptions) => callMongoClient({ action: 'find', collection: 'products', filter, options }),
    findOne: (filter: Record<string, unknown>) => callMongoClient({ action: 'findOne', collection: 'products', filter }),
    insert: (document: Record<string, unknown>) => callMongoClient({ action: 'insertOne', collection: 'products', document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient({ action: 'updateOne', collection: 'products', filter, update }),
    upsert: (filter: Record<string, unknown>, document: Record<string, unknown>) => callMongoClient({ action: 'upsertOne', collection: 'products', filter, document }),
    delete: (filter: Record<string, unknown>) => callMongoClient({ action: 'deleteOne', collection: 'products', filter }),
  },

  /** ── Assignments ── */
  assignments: {
    find: (filter = {}, options?: QueryOptions) => callMongoClient({ action: 'find', collection: 'assignments', filter, options }),
    findOne: (filter: Record<string, unknown>) => callMongoClient({ action: 'findOne', collection: 'assignments', filter }),
    insert: (document: Record<string, unknown>) => callMongoClient({ action: 'insertOne', collection: 'assignments', document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient({ action: 'updateOne', collection: 'assignments', filter, update: { $set: update } }),
    updateMany: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient({ action: 'updateMany', collection: 'assignments', filter, update: { $set: update } }),
    delete: (filter: Record<string, unknown>) => callMongoClient({ action: 'deleteOne', collection: 'assignments', filter }),
  },

  /** ── Work Logs ── */
  worklogs: {
    find: (filter = {}, options?: QueryOptions) => callMongoClient({ action: 'find', collection: 'worklogs', filter, options }),
    insert: (document: Record<string, unknown>) => callMongoClient({ action: 'insertOne', collection: 'worklogs', document }),
  },

  /** ── Attendance ── */
  attendance: {
    find: (filter = {}, options?: QueryOptions) => callMongoClient({ action: 'find', collection: 'attendance', filter, options }),
    findOne: (filter: Record<string, unknown>) => callMongoClient({ action: 'findOne', collection: 'attendance', filter }),
    insert: (document: Record<string, unknown>) => callMongoClient({ action: 'insertOne', collection: 'attendance', document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient({ action: 'updateOne', collection: 'attendance', filter, update: { $set: update } }),
  },

  /** ── Leaves ── */
  leaves: {
    find: (filter = {}) => callMongoClient({ action: 'find', collection: 'leaves', filter }),
    insert: (document: Record<string, unknown>) => callMongoClient({ action: 'insertOne', collection: 'leaves', document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient({ action: 'updateOne', collection: 'leaves', filter, update: { $set: update } }),
  },

  /** ── Tasks ── */
  tasks: {
    find: (filter = {}) => callMongoClient({ action: 'find', collection: 'tasks', filter }),
    upsert: (filter: Record<string, unknown>, document: Record<string, unknown>) => callMongoClient({ action: 'upsertOne', collection: 'tasks', filter, document }),
    delete: (filter: Record<string, unknown>) => callMongoClient({ action: 'deleteOne', collection: 'tasks', filter }),
  },

  /** ── Dispatches ── */
  dispatches: {
    find: (filter = {}) => callMongoClient({ action: 'find', collection: 'dispatches', filter }),
    insert: (document: Record<string, unknown>) => callMongoClient({ action: 'insertOne', collection: 'dispatches', document }),
    update: (filter: Record<string, unknown>, update: Record<string, unknown>) => callMongoClient({ action: 'updateOne', collection: 'dispatches', filter, update: { $set: update } }),
  },
};
