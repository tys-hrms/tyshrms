import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'tys_hrms';
const RP_ID = process.env.VERCEL_URL || 'localhost';
const Origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { body, userId } = req.body;
    if (!body || !userId) return res.status(400).json({ error: 'Missing authentication body or userId' });

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // 1. Get stored challenge
    const challengeDoc = await db.collection('challenges').findOne({ userId });
    if (!challengeDoc) return res.status(400).json({ error: 'Missing challenge for user' });

    // 2. Get user's authenticator from database
    const user = await db.collection('users').findOne({ id: userId });
    const authenticator = user?.biometricCredentials?.find(c => c.id === body.id);
    if (!authenticator) return res.status(400).json({ error: 'Authenticator not found for this user' });

    // 3. Verify authentication response
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: Origin,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(authenticator.id, 'base64'),
        credentialPublicKey: Buffer.from(authenticator.publicKey, 'base64'),
        counter: authenticator.counter || 0,
      },
    });

    if (verification.verified) {
      // 4. Update the authenticator counter to prevent replay attacks
      await db.collection('users').updateOne(
        { id: userId, 'biometricCredentials.id': body.id },
        { $set: { 'biometricCredentials.$.counter': verification.authenticationInfo.newCounter } }
      );

      // Clean up challenge
      await db.collection('challenges').deleteOne({ userId });

      await client.close();
      return res.status(200).json({ success: true, user });
    } else {
      await client.close();
      return res.status(400).json({ success: false, error: 'Authentication verification failed' });
    }
  } catch (err) {
    console.error('[WebAuthn Authentication Verification Error]', err);
    return res.status(500).json({ error: err.message });
  }
}
