/**
 * Multi-Tenant Database Schema Migration
 *
 * This creates the infrastructure for organizations (workspaces) where:
 * - Multiple users can belong to an organization
 * - Users can have different roles (owner, admin, member)
 * - All resources (templates, conversations, etc.) belong to an organization
 */

const { db } = require('../config/database');

async function createMultiTenantSchema() {
  try {
    console.log('🏢 Creating multi-tenant schema...\n');

    // 1. Create organizations table
    console.log('1️⃣ Creating organizations table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        owner_id TEXT NOT NULL,
        plan_type TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'active',
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);
    console.log('   ✅ Organizations table created\n');

    // 2. Create organization_members table (junction table)
    console.log('2️⃣ Creating organization_members table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        invited_by TEXT,
        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        joined_at TIMESTAMP,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id),
        UNIQUE(organization_id, user_id)
      )
    `);
    console.log('   ✅ Organization members table created\n');

    // 3. Add organization_id to existing tables
    console.log('3️⃣ Adding organization_id columns to existing tables...');

    const tables = ['templates', 'conversations', 'leads', 'custom_actions', 'qualification_questions', 'faqs'];

    for (const table of tables) {
      try {
        // Check if column already exists
        const tableInfo = await db.all(`PRAGMA table_info(${table})`);
        const hasOrgColumn = tableInfo.some(col => col.name === 'organization_id');

        if (!hasOrgColumn) {
          await db.run(`ALTER TABLE ${table} ADD COLUMN organization_id TEXT`);
          console.log(`   ✅ Added organization_id to ${table}`);
        } else {
          console.log(`   ⏭️  organization_id already exists in ${table}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not add organization_id to ${table}: ${error.message}`);
      }
    }
    console.log('');

    // 4. Create invitations table
    console.log('4️⃣ Creating invitations table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS organization_invitations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        invited_by TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id)
      )
    `);
    console.log('   ✅ Organization invitations table created\n');

    // 5. Create indexes for performance
    console.log('5️⃣ Creating indexes...');
    await db.run(`CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_templates_org ON templates(organization_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_invitations_token ON organization_invitations(token)`);
    console.log('   ✅ Indexes created\n');

    console.log('🎉 Multi-tenant schema created successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run migration to assign existing data to organizations');
    console.log('   2. Update API routes to filter by organization_id');
    console.log('   3. Add organization switcher to UI');
    console.log('   4. Implement invitation flow');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

createMultiTenantSchema();
