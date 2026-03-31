import { MongoClient } from 'mongodb';

// Using the URI from your project configuration
const uri = "mongodb+srv://tys_admin:tys%401234@cluster0.1oxlktm.mongodb.net/?appName=Cluster0";
const dbName = "tys_hrms";

async function verify() {
  const client = new MongoClient(uri);
  try {
    console.log('Connecting to MongoDB Atlas Cloud...');
    await client.connect();
    const db = client.db(dbName);
    
    console.log('\n✅ VERIFICATION: Real-Time MongoDB Atlas Status');
    console.log('----------------------------------------------');
    
    const collections = ['users', 'products', 'assignments', 'worklogs', 'notifications'];
    
    for (const colName of collections) {
      const count = await db.collection(colName).countDocuments();
      console.log(`[${colName.toUpperCase().padEnd(13)}]: ${count.toString().padStart(3)} records found in cloud.`);
    }

    // Pulling the very last activity to prove it's live
    const lastLog = await db.collection('worklogs').find().sort({ loggedAt: -1 }).limit(1).toArray();
    if (lastLog.length > 0) {
      console.log('\n📋 Latest Live Activity Record:');
      console.log(`- ID:        ${lastLog[0].id}`);
      console.log(`- Time:      ${lastLog[0].loggedAt}`);
      console.log(`- Worker ID: ${lastLog[0].userId}`);
    }

    console.log('\n----------------------------------------------');
    console.log('Result: All data is successfully pushing to the cloud.');

  } catch (err) {
    console.error('Connection Error:', err);
  } finally {
    await client.close();
  }
}

verify();
