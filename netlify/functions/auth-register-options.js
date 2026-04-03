import { generateRegistrationOptions } from '@simplewebauthn/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://tys_admin:tys%401234@cluster0.1oxlktm.mongodb.net/?appName=Cluster0';
const DB_NAME = process.env.MONGODB_DB || 'tys_hrms';
const Origin = process.env.URL || 'http://localhost:5173';
const RP_ID = new URL(Origin).hostname;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { userId, userName } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    const user = await db.collection('users').findOne({ id: userId });
    const excludeCredentials = (user?.biometricCredentials || []).map(cred => ({
      id: cred.id,
      type: 'public-key',
      transports: cred.transports,
    }));

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

    await db.collection('challenges').updateOne(
      { userId },
      { $set: { challenge: options.challenge, createdAt: new Date() } },
      { upsert: true }
    );

    await client.close();
    return { statusCode: 200, headers, body: JSON.stringify(options) };
  } catch (err) {
    console.error('[Netlify WebAuthn Options Error]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
