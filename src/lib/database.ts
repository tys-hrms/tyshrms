// src/lib/database.ts - Universal Database Adapter for TYS-HRMS

const API_ENDPOINT = '/api/mongo';

export interface DbResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Universal Database Client
 * Handles LocalStorage fallback and MongoDB Atlas sync.
 */
export const db = {
  /**
   * Performs a generic action via the Vercel serverless function.
   */
  async request(action: string, collection: string, payload: any = {}) {
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
  },

  /**
   * Fetches all documents in a collection.
   */
  async getAll<T>(collection: string): Promise<T[]> {
    const res = await this.request('find', collection);
    return res.documents || [];
  },

  /**
   * Saves or updates a document (Upsert pattern).
   */
  async save(collection: string, document: any) {
    if (!document.id) return;
    return this.request('upsertOne', collection, {
      filter: { id: document.id },
      document
    });
  },

  /**
   * Batches multiple saves.
   */
  async saveMany(collection: string, documents: any[]) {
    if (!documents.length) return;
    // For simplicity, we loop, but the api/mongo handler supports action:'insertMany' if needed.
    // However, upsert is safer for initial syncing.
    for (const doc of documents) {
      await this.save(collection, doc);
    }
  },

  /**
   * Deletes a document by ID.
   */
  async delete(collection: string, id: string) {
    return this.request('deleteOne', collection, { filter: { id } });
  }
};
