import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://vnkt045_db_user:byU6RBdx6BMHrW6f@ac-z6rzsgs-shard-00-00.obki2is.mongodb.net:27017,ac-z6rzsgs-shard-00-01.obki2is.mongodb.net:27017,ac-z6rzsgs-shard-00-02.obki2is.mongodb.net:27017/hrmscore?ssl=true&replicaSet=atlas-cctgo0-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.MONGODB_DB || 'hrmscore';
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

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
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
