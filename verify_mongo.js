import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://tys_admin:tys%401234@cluster0.1oxlktm.mongodb.net/?appName=Cluster0";
const dbName = "tys_hrms";

async function verify() {
  const client = new MongoClient(uri);
  try {
    console.log('\n🔗 Connecting to MongoDB Atlas Cloud (tys_hrms)...\n');
    await client.connect();
    const db = client.db(dbName);

    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║        TYS-HRMS — Cloud Data Integrity Report        ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // All known collections after cloud-first migration
    const allCollections = [
      // Auth / Tenants
      { name: 'tenants',          label: 'Tenants / Orgs',      emoji: '🏢' },
      { name: 'users',            label: 'Staff Profiles',       emoji: '👤' },
      // Attendance
      { name: 'attendance',       label: 'Attendance Logs',      emoji: '🕐' },
      { name: 'breaks',           label: 'Break Logs',           emoji: '☕' },
      // Operations
      { name: 'products',         label: 'Products (SKUs)',       emoji: '📦' },
      { name: 'assignments',      label: 'Task Assignments',      emoji: '📋' },
      { name: 'worklogs',         label: 'Work Logs',            emoji: '📊' },
      { name: 'dispatches',       label: 'Dispatch Batches',     emoji: '🚚' },
      // HR
      { name: 'leaves',           label: 'Leave Requests',       emoji: '🌴' },
      { name: 'tasks',            label: 'Task Definitions',     emoji: '✅' },
      { name: 'rbac_permissions', label: 'RBAC Permissions',     emoji: '🔐' },
      // Workflow & Notifications
      { name: 'workflow_nodes',   label: 'Workflow Nodes',       emoji: '🔵' },
      { name: 'workflow_edges',   label: 'Workflow Edges',       emoji: '↔️' },
      { name: 'notifications',    label: 'Notifications',        emoji: '🔔' },
      { name: 'shifts',           label: 'Shift Definitions',    emoji: '⏰' },
      // CRM (cloud-native from day one)
      { name: 'crm_leads',        label: 'CRM Leads',            emoji: '💼' },
      { name: 'crm_orders',       label: 'CRM Orders',           emoji: '🛒' },
      { name: 'crm_settings',     label: 'CRM Settings',         emoji: '⚙️' },
      // Settings
      { name: 'app_settings',     label: 'App/Tenant Settings',  emoji: '🔧' },
    ];

    let totalRecords = 0;
    let populatedCount = 0;

    console.log('  Collection             | Records | Status');
    console.log('  -----------------------+---------+-------');

    for (const col of allCollections) {
      try {
        const count = await db.collection(col.name).countDocuments();
        totalRecords += count;
        const status = count > 0 ? '✅ Has Data' : '⬜ Empty';
        if (count > 0) populatedCount++;
        console.log(`  ${col.emoji} ${col.label.padEnd(22)}| ${String(count).padStart(5)} recs | ${status}`);
      } catch {
        console.log(`  ${col.emoji} ${col.label.padEnd(22)}| --error-- | ❌ Collection error`);
      }
    }

    console.log('\n  -----------------------+---------+-------');
    console.log(`  📊 TOTAL RECORDS: ${totalRecords} across ${populatedCount}/${allCollections.length} active collections\n`);

    // Latest record probes
    console.log('╔══════════════════════════════════════════╗');
    console.log('║         Latest Record Samples            ║');
    console.log('╚══════════════════════════════════════════╝\n');

    // Latest attendance
    const lastAttendance = await db.collection('attendance').find().sort({ clockIn: -1 }).limit(1).toArray();
    if (lastAttendance.length > 0) {
      const a = lastAttendance[0];
      console.log(`🕐 Last Attendance: User=${a.userId} | Date=${a.date} | In=${a.clockIn?.slice(11,19) || 'N/A'} | Out=${a.clockOut?.slice(11,19) || 'Active'}`);
    } else { console.log('🕐 Last Attendance: (no records yet)'); }

    // Latest leave
    const lastLeave = await db.collection('leaves').find().sort({ createdAt: -1 }).limit(1).toArray();
    if (lastLeave.length > 0) {
      const l = lastLeave[0];
      console.log(`🌴 Last Leave:      User=${l.userId} | Status=${l.status} | Date=${l.date}`);
    } else { console.log('🌴 Last Leave:      (no records yet)'); }

    // Latest CRM lead
    const lastLead = await db.collection('crm_leads').find().sort({ createdAt: -1 }).limit(1).toArray();
    if (lastLead.length > 0) {
      const c = lastLead[0];
      console.log(`💼 Last CRM Lead:   Ticket=${c.ticketNumber} | Customer=${c.customerName} | Stage=${c.stage}`);
    } else { console.log('💼 Last CRM Lead:   (no records yet)'); }

    // Latest worklog
    const lastLog = await db.collection('worklogs').find().sort({ loggedAt: -1 }).limit(1).toArray();
    if (lastLog.length > 0) {
      const w = lastLog[0];
      console.log(`📊 Last Worklog:    User=${w.userId} | Date=${w.date} | LoggedAt=${w.loggedAt?.slice(11,19) || 'N/A'}`);
    } else { console.log('📊 Last Worklog:    (no records yet)'); }

    // RBAC spot check
    const rbacCount = await db.collection('rbac_permissions').countDocuments();
    console.log(`🔐 RBAC Matrix:     ${rbacCount} permission rules stored in cloud`);

    console.log('\n══════════════════════════════════════════════');
    console.log('✅ Verification Complete. Cloud is the source of truth.');
    console.log('══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Connection Error:', err);
    console.error('   Check: MongoDB Atlas is running, IP is whitelisted, URI is correct.\n');
  } finally {
    await client.close();
  }
}

verify();
