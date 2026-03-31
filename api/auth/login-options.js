import { generateAuthenticationOptions } from '@simplewebauthn/server';
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
    const { userId } = req.body;
    // For passwordless/biometric login, we might not have a userId initially if we're using "Conditional UI"
    // However, for this implementation, we assume the user identifies themselves first or has been remembered.

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    let allowCredentials = [];
    if (userId) {
      const user = await db.collection('users').findOne({ id: userId });
      if (user?.biometricCredentials) {
        allowCredentials = user.biometricCredentials.map(cred => ({
          id: cred.id,
          type: 'public-key',
          transports: cred.transports,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // We store the challenge broadly if no userId, or specifically if userId is provided
    await db.collection('challenges').updateOne(
      { userId: userId || 'anonymous' },
      { $set: { challenge: options.challenge, createdAt: new Date() } },
      { upsert: true }
    );

    await client.close();
    return res.status(200).json(options);
  } catch (err) {
    console.error('[WebAuthn Login Options Error]', err);
    return res.status(500).json({ error: err.message });
  }
}
