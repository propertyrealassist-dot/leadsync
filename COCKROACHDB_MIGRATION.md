# CockroachDB Migration Guide

This guide will help you migrate your LeadSync application from SQLite to CockroachDB (PostgreSQL).

## Overview

LeadSync now supports both SQLite (for development) and CockroachDB (for production). You can switch between them using the `DB_TYPE` environment variable.

## Benefits of CockroachDB

- **Scalability**: Automatically scales horizontally
- **High Availability**: Built-in replication and failover
- **Cloud-Native**: Designed for distributed cloud environments
- **PostgreSQL Compatible**: Uses standard PostgreSQL drivers
- **Free Tier**: 5GB storage and 50M Request Units/month

## Prerequisites

1. Node.js and npm installed
2. Existing SQLite database with data
3. CockroachDB account (free tier available at https://cockroachlabs.cloud/)

## Step 1: Create CockroachDB Cluster

1. Go to https://cockroachlabs.cloud/
2. Sign up for a free account
3. Create a new cluster:
   - Choose "Serverless"
   - Select your preferred region
   - Name your cluster (e.g., "leadsync-prod")
4. Create a SQL user:
   - Username: `leadsync`
   - Generate a strong password (save it!)
5. Get your connection string:
   - Click "Connect"
   - Select "General connection string"
   - Copy the connection string

Your connection string will look like:
```
postgresql://leadsync:YOUR_PASSWORD@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

## Step 2: Configure Environment Variables

1. Open `backend/.env`
2. Add your CockroachDB connection string:

```env
# Database Configuration
DB_TYPE=sqlite  # Keep as sqlite for now
DATABASE_URL=postgresql://leadsync:YOUR_PASSWORD@YOUR_CLUSTER_HOST:26257/defaultdb?sslmode=verify-full
```

Replace `YOUR_PASSWORD` and `YOUR_CLUSTER_HOST` with your actual values.

## Step 3: Run the Migration

The migration script will:
- Create all tables in CockroachDB
- Copy all data from SQLite to CockroachDB
- Preserve all relationships and constraints

**Run the migration:**

```bash
cd backend
node src/scripts/migrate-to-cockroach.js
```

You should see output like:
```
🚀 Starting migration from SQLite to CockroachDB...
✅ Connected to CockroachDB
🔧 Initializing CockroachDB schema...
✅ CockroachDB schema initialized successfully

📦 Migrating users...
Found 5 users to migrate
  ✅ Migrated user: user@example.com
✅ Users migration complete: 5 users

📦 Migrating templates...
Found 3 templates to migrate
  ✅ Migrated template: Real Estate Lead
✅ Templates migration complete: 3 templates

...

✅ ========================================
✅ MIGRATION COMPLETE!
✅ ========================================
```

## Step 4: Verify Migration

1. Log in to CockroachDB console
2. Go to "SQL Shell"
3. Run verification queries:

```sql
-- Check users
SELECT COUNT(*) FROM users;

-- Check templates
SELECT COUNT(*) FROM templates;

-- Check conversations
SELECT COUNT(*) FROM conversations;

-- View a sample user
SELECT id, email, first_name, last_name, created_at FROM users LIMIT 5;
```

## Step 5: Switch to PostgreSQL

Once you've verified the data, update your `.env`:

```env
DB_TYPE=postgres  # Changed from sqlite
```

## Step 6: Restart Your Application

```bash
npm start
```

You should see:
```
🗄️  Database Type: POSTGRES
✅ Using PostgreSQL/CockroachDB
✅ Connected to CockroachDB
🚀 Server running on http://localhost:3001
```

## Step 7: Test Your Application

1. Test user login
2. Create a new template
3. Start a conversation
4. Check that all features work correctly

## Rollback (If Needed)

If you need to go back to SQLite:

1. Update `.env`:
```env
DB_TYPE=sqlite
```

2. Restart your application

Your SQLite database is unchanged, so you can switch back anytime.

## Database Models

The application now uses database models that abstract SQLite and PostgreSQL differences:

- `src/models/User.js` - User operations
- `src/models/Template.js` - Template operations
- `src/database/adapter.js` - Database abstraction layer

## Production Deployment

### For Vercel/Railway/Render:

1. Add environment variable in your hosting platform:
   ```
   DB_TYPE=postgres
   DATABASE_URL=postgresql://...
   ```

2. Deploy your application

3. The schema will be automatically initialized on first connection

### Connection Pooling

CockroachDB uses connection pooling with these settings:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

These are configured in `src/config/database-postgres.js`

## Performance Optimization

### Indexes

All critical tables have indexes for optimal query performance:
- Users: email, client_id, api_key
- Templates: user_id, tag
- Conversations: user_id, template_id
- Messages: conversation_id
- Appointments: user_id, start_time

### Query Optimization

The PostgreSQL adapter logs query execution times:
```
📊 Query executed { duration: 45, rows: 1 }
```

Monitor these logs to identify slow queries.

## Monitoring

### CockroachDB Console

Access your cluster's metrics:
1. Go to https://cockroachlabs.cloud/
2. Select your cluster
3. View:
   - SQL Activity
   - Metrics & Monitoring
   - Database health

### Application Logs

The application logs database operations:
- Connection status
- Query execution times
- Error messages

## Troubleshooting

### Connection Issues

**Error: `ECONNREFUSED`**
- Check your DATABASE_URL is correct
- Verify your IP is allowed in CockroachDB firewall settings
- Confirm your cluster is running

**Error: `password authentication failed`**
- Verify your username and password
- Check for special characters in password (URL encode them)

### Migration Issues

**Error: `duplicate key value`**
- The migration uses `ON CONFLICT` clauses to handle duplicates
- Safe to re-run the migration script

**Error: `foreign key constraint`**
- Ensure you're migrating tables in the correct order
- The script handles this automatically

### Performance Issues

**Slow queries**
- Check CockroachDB query performance in the console
- Review indexes on frequently queried columns
- Consider upgrading from free tier if needed

## Data Backup

### CockroachDB Backups

CockroachDB automatically backs up your data. Free tier includes:
- Automatic daily backups
- 7-day retention
- Point-in-time recovery

### Manual Backup

```bash
# Export from CockroachDB
cockroach dump defaultdb --url="postgresql://..."

# Or use the migration script in reverse
# (Future enhancement)
```

## Cost Management

### Free Tier Limits

- 5 GB storage
- 50M Request Units/month
- Automatic throttling if exceeded

### Monitor Usage

1. Go to CockroachDB Console
2. Click "Usage"
3. View your current consumption

### Upgrade Options

If you exceed free tier:
- Basic: $1/GB storage + $0.50/M RUs
- Standard: $1.50/GB storage + $0.40/M RUs
- Advanced: Custom pricing

## Security

### SSL/TLS

CockroachDB requires SSL connections by default:
```javascript
ssl: {
  rejectUnauthorized: false
}
```

### Credentials

- Never commit DATABASE_URL to git
- Use environment variables
- Rotate passwords regularly
- Use strong passwords (20+ characters)

### Network Security

- CockroachDB restricts connections by IP
- Add your production server IPs to allowlist
- Use VPC peering for enhanced security (paid tiers)

## Advanced Configuration

### Custom Connection Pool

Edit `src/config/database-postgres.js`:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Maximum pool size
  idleTimeoutMillis: 30000,  // Close idle clients after 30s
  connectionTimeoutMillis: 5000  // Timeout connection after 5s
});
```

### Multi-Region Setup

For global deployments:
1. Create multi-region cluster in CockroachDB
2. Configure region-specific read replicas
3. Use connection strings with region hints

## Support

### Issues

If you encounter problems:
1. Check application logs
2. Review CockroachDB console
3. File an issue on GitHub

### Resources

- CockroachDB Docs: https://www.cockroachlabs.com/docs/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- LeadSync GitHub: https://github.com/yourusername/leadsync

## Migration Checklist

- [ ] Created CockroachDB cluster
- [ ] Obtained connection string
- [ ] Updated .env with DATABASE_URL
- [ ] Ran migration script successfully
- [ ] Verified data in CockroachDB console
- [ ] Tested application with DB_TYPE=postgres
- [ ] All features working correctly
- [ ] Updated production environment variables
- [ ] Deployed to production
- [ ] Monitored for 24 hours
- [ ] Documented any custom configurations

## Next Steps

After successful migration:

1. **Monitor Performance**: Watch query times and adjust indexes
2. **Set Up Alerts**: Configure CockroachDB alerts for issues
3. **Regular Backups**: Schedule additional backups if needed
4. **Security Review**: Audit access controls and credentials
5. **Documentation**: Update team documentation with new setup

## Conclusion

You've successfully migrated to CockroachDB! Your application now has:

✅ Cloud-native, scalable database
✅ Automatic backups and replication
✅ High availability and fault tolerance
✅ Production-ready infrastructure

Enjoy your new distributed SQL database! 🚀
