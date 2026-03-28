// api/mongo.js — TYS-HRMS Universal MongoDB Serverless Function
// Deployed automatically by Vercel from the /api folder.

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'tys_hrms';

// ─── Allowed collections (whitelist for security) ────────────────────────────
const ALLOWED_COLLECTIONS = new Set([
  'users',
  'products',
  'assignments',
  'worklogs',
  'dispatches',
  'leaves',
  'tasks',
  'attendance',
  'breaks',
  'carry_forwards',
  'app_settings',
  'defect_reasons',
  'workflow_nodes',
  'workflow_edges',
  'notifications',
]);

// ─── MongoDB Client (cached across warm invocations) ─────────────────────────
let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not set.');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

// ─── CORS Helper ─────────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.method === 'POST' ? req.body : {};
    const { action, collection, filter = {}, document, documents, update, options = {} } = body;

    // ── Validate collection ──
    if (!collection || !ALLOWED_COLLECTIONS.has(collection)) {
      return res.status(400).json({ error: `Invalid or missing collection: "${collection}"` });
    }

    // ── Validate action ──
    const validActions = ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'upsertOne'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid or missing action: "${action}"` });
    }

    const client = await getClient();
    const db = client.db(DB_NAME);
    const col = db.collection(collection);

    // ── Convert string _id to ObjectId where needed ──
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
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[MongoDB API Error]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
