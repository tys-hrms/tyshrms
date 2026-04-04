import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://vnkt045_db_user:byU6RBdx6BMHrW6f@159.41.197.69:27017/hrmscore?ssl=true&authSource=admin&directConnection=true&retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'hrmscore';
const RP_ID = process.env.URL ? new URL(process.env.URL).hostname : 'localhost';

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
    const { userId } = JSON.parse(event.body || '{}');

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

    await db.collection('challenges').updateOne(
      { userId: userId || 'anonymous' },
      { $set: { challenge: options.challenge, createdAt: new Date() } },
      { upsert: true }
    );

    await client.close();
    return { statusCode: 200, headers, body: JSON.stringify(options) };
  } catch (err) {
    console.error('[Netlify WebAuthn Login Options Error]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
