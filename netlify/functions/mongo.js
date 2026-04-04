// netlify/functions/mongo.js — HRMSCore Universal MongoDB Serverless Function
// Adapted for Netlify from the original Vercel /api/mongo.js handler.

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 
  "mongodb://vnkt045_db_user:byU6RBdx6BMHrW6f@ac-z6rzsgs-shard-00-00.obki2is.mongodb.net:27017,ac-z6rzsgs-shard-00-01.obki2is.mongodb.net:27017,ac-z6rzsgs-shard-00-02.obki2is.mongodb.net:27017/hrmscore?ssl=true&replicaSet=atlas-cctgo0-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = process.env.MONGODB_DB || "hrmscore";

const ALLOWED_COLLECTIONS = new Set([
  'users', 'products', 'assignments', 'worklogs', 'dispatches', 'leaves',
  'tasks', 'attendance', 'breaks', 'carry_forwards', 'app_settings',
  'defect_reasons', 'workflow_nodes', 'workflow_edges', 'notifications',
  'challenges', 'rbac_permissions', 'shifts', 'tenants',
  'crm_leads', 'crm_orders', 'crm_tickets', 'payroll_records', 'salary_records',
  'inventory_logs',
]);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not set.');
  
  console.log(`[DB] Attempting connection to Atlas...`);
  
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 60000,
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 90000,
    directConnection: false,
    retryWrites: true,
  });
  
  try {
    await client.connect();
    console.log(`[DB] Success! Connected to cluster.`);
    cachedClient = client;
    return client;
  } catch (err) {
    console.error(`[DB] Connection failed:`, err.message);
    throw err;
  }
}

export const handler = async (event) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {};
    const { action, collection, filter = {}, document, documents, update, options = {} } = body;

    // Validate collection
    if (!collection || !ALLOWED_COLLECTIONS.has(collection)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Invalid or missing collection: "${collection}"` }) };
    }

    // Validate action
    const validActions = ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'upsertOne'];
    if (!action || !validActions.includes(action)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Invalid or missing action: "${action}"` }) };
    }

    const client = await getClient();
    const db = client.db(DB_NAME);
    const col = db.collection(collection);

    const resolveFilter = (f) => {
      if (!f) return {};
      if (f._id && typeof f._id === 'string') {
        try { return { ...f, _id: new ObjectId(f._id) }; } catch { return f; }
      }
      return f;
    };

    const resolvedFilter = resolveFilter(filter);
    let result;

    switch (action) {
      case 'find': {
        const { sort, limit, skip, projection } = options;
        let cursor = col.find(resolvedFilter, { projection });
        if (sort) cursor = cursor.sort(sort);
        if (skip) cursor = cursor.skip(skip);
        if (limit) cursor = cursor.limit(limit);
        result = { documents: await cursor.toArray() };
        break;
      }
      case 'findOne': {
        const doc = await col.findOne(resolvedFilter, { projection: options.projection });
        result = { document: doc };
        break;
      }
      case 'insertOne': {
        const insertResult = await col.insertOne({
          ...document,
          _createdAt: new Date().toISOString(),
          _updatedAt: new Date().toISOString(),
        });
        result = { insertedId: insertResult.insertedId.toString() };
        break;
      }
      case 'insertMany': {
        const now = new Date().toISOString();
        const docsWithMeta = (documents || []).map(d => ({
          ...d, _createdAt: now, _updatedAt: now,
        }));
        const insertManyResult = await col.insertMany(docsWithMeta);
        result = { insertedCount: insertManyResult.insertedCount };
        break;
      }
      case 'updateOne': {
        const updateOp = update?.$set
          ? { ...update, $set: { ...update.$set, _updatedAt: new Date().toISOString() } }
          : { $set: { ...update, _updatedAt: new Date().toISOString() } };
        const upOneResult = await col.updateOne(resolvedFilter, updateOp);
        result = { matchedCount: upOneResult.matchedCount, modifiedCount: upOneResult.modifiedCount };
        break;
      }
      case 'updateMany': {
        const updateManyOp = update?.$set
          ? { ...update, $set: { ...update.$set, _updatedAt: new Date().toISOString() } }
          : { $set: { ...update, _updatedAt: new Date().toISOString() } };
        const upManyResult = await col.updateMany(resolvedFilter, updateManyOp);
        result = { matchedCount: upManyResult.matchedCount, modifiedCount: upManyResult.modifiedCount };
        break;
      }
      case 'upsertOne': {
        const upsertOp = {
          $set: { ...document, _updatedAt: new Date().toISOString() },
          $setOnInsert: { _createdAt: new Date().toISOString() },
        };
        const upsertResult = await col.updateOne(resolvedFilter, upsertOp, { upsert: true });
        result = {
          matchedCount: upsertResult.matchedCount,
          modifiedCount: upsertResult.modifiedCount,
          upsertedId: upsertResult.upsertedId?.toString() || null,
        };
        break;
      }
      case 'deleteOne': {
        const delResult = await col.deleteOne(resolvedFilter);
        result = { deletedCount: delResult.deletedCount };
        break;
      }
      case 'deleteMany': {
        const delManyResult = await col.deleteMany(resolvedFilter);
        result = { deletedCount: delManyResult.deletedCount };
        break;
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error('[Netlify MongoDB API Error]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Internal server error' }) };
  }
};
