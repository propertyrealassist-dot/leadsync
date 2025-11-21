/**
 * Migrate existing data to multi-tenant structure
 *
 * This script:
 * 1. Creates a default organization for each existing user
 * 2. Assigns all user's data to their organization
 * 3. Makes them the owner of their organization
 */

const { db, generateUUID } = require('../config/database');

async function migrateExistingData() {
  try {
    console.log('🔄 Migrating existing data to multi-tenant structure...\n');

    // 1. Get all users
    console.log('1️⃣ Loading existing users...');
    const users = await db.all('SELECT id, email, first_name, last_name, company_name FROM users');
    console.log(`   Found ${users.length} users\n`);

    for (const user of users) {
      console.log(`📦 Processing user: ${user.email}`);

      // 2. Check if user already has an organization
      const existingOrg = await db.get(
        'SELECT id FROM organizations WHERE owner_id = ?',
        [user.id]
      );

      let organizationId;

      if (existingOrg) {
        console.log('   ⏭️  Organization already exists');
        organizationId = existingOrg.id;
      } else {
        // 3. Create organization for user
        organizationId = generateUUID();
        const orgName = user.company_name ||
                       `${user.first_name || user.email.split('@')[0]}'s Workspace`;
        const slug = orgName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-' + organizationId.substring(0, 8);

        await db.run(`
          INSERT INTO organizations (id, name, slug, owner_id, plan_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [organizationId, orgName, slug, user.id]);
        console.log(`   ✅ Created organization: ${orgName}`);

        // 4. Add user as owner in organization_members
        const memberId = generateUUID();
        await db.run(`
          INSERT INTO organization_members (id, organization_id, user_id, role, status, joined_at)
          VALUES (?, ?, ?, 'owner', 'active', CURRENT_TIMESTAMP)
        `, [memberId, organizationId, user.id]);
        console.log('   ✅ Added user as organization owner');
      }

      // 5. Update user's data with organization_id
      const tables = [
        { name: 'templates', userField: 'user_id' },
        { name: 'conversations', userField: 'user_id' },
        { name: 'leads', userField: 'user_id' },
      ];

      for (const table of tables) {
        try {
          const result = await db.run(`
            UPDATE ${table.name}
            SET organization_id = ?
            WHERE ${table.userField} = ? AND organization_id IS NULL
          `, [organizationId, user.id]);

          const changes = result?.changes || 0;
          if (changes > 0) {
            console.log(`   ✅ Updated ${changes} records in ${table.name}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not update ${table.name}: ${error.message}`);
        }
      }

      // 6. Update related data (qualification_questions, faqs, custom_actions)
      try {
        // Get all templates for this user
        const userTemplates = await db.all(
          'SELECT id FROM templates WHERE user_id = ?',
          [user.id]
        );

        for (const template of userTemplates) {
          // Update qualification questions
          await db.run(`
            UPDATE qualification_questions
            SET organization_id = ?
            WHERE template_id = ? AND organization_id IS NULL
          `, [organizationId, template.id]);

          // Update FAQs
          await db.run(`
            UPDATE faqs
            SET organization_id = ?
            WHERE template_id = ? AND organization_id IS NULL
          `, [organizationId, template.id]);

          // Update custom actions
          await db.run(`
            UPDATE custom_actions
            SET organization_id = ?
            WHERE template_id = ? AND organization_id IS NULL
          `, [organizationId, template.id]);
        }

        if (userTemplates.length > 0) {
          console.log(`   ✅ Updated related data for ${userTemplates.length} templates`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not update related data: ${error.message}`);
      }

      console.log('');
    }

    console.log('🎉 Migration completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Migrated ${users.length} users`);
    console.log(`   - Created/verified organizations`);
    console.log(`   - Assigned all data to organizations`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateExistingData();
