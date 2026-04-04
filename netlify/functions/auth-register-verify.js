import { verifyRegistrationResponse } from '@simplewebauthn/server';
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
    if (!body || !userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing registration body or userId' }) };

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

      await db.collection('users').updateOne(
        { id: userId },
        { $push: { biometricCredentials: newAuthenticator } }
      );
      await db.collection('challenges').deleteOne({ userId });
      await client.close();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } else {
      await client.close();
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Registration verification failed' }) };
    }
  } catch (err) {
    console.error('[Netlify WebAuthn Registration Verification Error]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
