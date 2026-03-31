import { generateRegistrationOptions } from '@simplewebauthn/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'tys_hrms';
const RP_ID = process.env.VERCEL_URL || 'localhost';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, userName } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // 1. Get user's current authenticators to exclude them
    const user = await db.collection('users').findOne({ id: userId });
    const excludeCredentials = (user?.biometricCredentials || []).map(cred => ({
      id: cred.id,
      type: 'public-key',
      transports: cred.transports,
    }));

    // 2. Generate options
    const options = await generateRegistrationOptions({
      rpName: 'TYS-HRMS',
      rpID: RP_ID,
      userID: userId,
      userName: userName || userId,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // 3. Save challenge to DB to verify later
    await db.collection('challenges').updateOne(
      { userId },
      { $set: { challenge: options.challenge, createdAt: new Date() } },
      { upsert: true }
    );

    await client.close();
    return res.status(200).json(options);
  } catch (err) {
    console.error('[WebAuthn Options Error]', err);
    return res.status(500).json({ error: err.message });
  }
}
