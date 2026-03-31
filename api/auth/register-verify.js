import { verifyRegistrationResponse } from '@simplewebauthn/server';
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
    if (!body || !userId) return res.status(400).json({ error: 'Missing registration body or userId' });

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // 1. Get stored challenge
    const challengeDoc = await db.collection('challenges').findOne({ userId });
    if (!challengeDoc) return res.status(400).json({ error: 'Missing challenge for user' });

    // 2. Verify registration response
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: Origin,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      const newAuthenticator = {
        id: Buffer.from(credentialID).toString('base64'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        transports: body.response.transports,
        createdAt: new Date().toISOString(),
      };

      // 3. Store authenticator in user document
      await db.collection('users').updateOne(
        { id: userId },
        { $push: { biometricCredentials: newAuthenticator } }
      );

      // Clean up challenge
      await db.collection('challenges').deleteOne({ userId });

      await client.close();
      return res.status(200).json({ success: true });
    } else {
      await client.close();
      return res.status(400).json({ success: false, error: 'Registration verification failed' });
    }
  } catch (err) {
    console.error('[WebAuthn Registration Verification Error]', err);
    return res.status(500).json({ error: err.message });
  }
}
