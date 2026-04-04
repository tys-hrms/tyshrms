import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://vnkt045_db_user:byU6RBdx6BMHrW6f@159.41.197.69:27017/hrmscore?ssl=true&authSource=admin&directConnection=true&retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'hrmscore';
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
    const { body, userId } = JSON.parse(event.body || '{}');
    if (!body || !userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing authentication body or userId' }) };

    const strings = [
      MONGODB_URI,
      "mongodb+srv://vnkt045_db_user:byU6RBdx6BMHrW6f@cluster0.obki2is.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    ];

    let lastError;
    let client;
    for (const str of strings) {
      for (let i = 0; i < 2; i++) {
        try {
          client = new MongoClient(str, {
            connectTimeoutMS: 60000,
            serverSelectionTimeoutMS: 60000,
            socketTimeoutMS: 90000,
            tlsAllowInvalidCertificates: true,
            directConnection: !str.includes('srv'),
          });
          await client.connect();
          break;
        } catch (err) {
          lastError = err;
          // Pauze between retries
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      if (client?.topology?.isConnected()) break;
    }
    if (!client?.topology?.isConnected()) throw lastError || new Error('Failed to connect to any DB path');
    const db = client.db(DB_NAME);

    const challengeDoc = await db.collection('challenges').findOne({ userId });
    if (!challengeDoc) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing challenge for user' }) };

    const user = await db.collection('users').findOne({ id: userId });
    const authenticator = user?.biometricCredentials?.find(c => c.id === body.id);
    if (!authenticator) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Authenticator not found for this user' }) };

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
      await db.collection('users').updateOne(
        { id: userId, 'biometricCredentials.id': body.id },
        { $set: { 'biometricCredentials.$.counter': verification.authenticationInfo.newCounter } }
      );
      await db.collection('challenges').deleteOne({ userId });
      await client.close();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, user }) };
    } else {
      await client.close();
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Authentication verification failed' }) };
    }
  } catch (err) {
    console.error('[Netlify WebAuthn Login Verification Error]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
