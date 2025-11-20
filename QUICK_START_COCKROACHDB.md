# Quick Start: CockroachDB Migration

## TL;DR - 5 Minute Setup

### 1. Get CockroachDB Connection String

```bash
# Sign up at https://cockroachlabs.cloud/
# Create free serverless cluster
# Copy connection string
```

### 2. Update .env

```bash
# In backend/.env
DB_TYPE=sqlite  # Keep as sqlite during migration
DATABASE_URL=postgresql://leadsync:YOUR_PASSWORD@YOUR_HOST:26257/defaultdb?sslmode=verify-full
```

### 3. Run Migration

```bash
cd backend
node src/scripts/migrate-to-cockroach.js
```

### 4. Switch to PostgreSQL

```bash
# In backend/.env
DB_TYPE=postgres  # Changed!
```

### 5. Restart & Test

```bash
npm start
# Test your application
```

## Done! 🎉

Your app is now using CockroachDB.

---

## Rollback

Need to go back? Easy:

```bash
# In backend/.env
DB_TYPE=sqlite
```

Your SQLite database is untouched.

---

## Verify Migration

Quick check in CockroachDB SQL Shell:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM templates;
SELECT COUNT(*) FROM conversations;
```

---

## Production Deployment

Add to your hosting platform (Vercel/Railway/Render):

```
DB_TYPE=postgres
DATABASE_URL=postgresql://...
```

---

## Files Created

- `backend/src/config/database-postgres.js` - PostgreSQL config
- `backend/src/models/User.js` - User model (supports both DBs)
- `backend/src/models/Template.js` - Template model (supports both DBs)
- `backend/src/database/adapter.js` - Database abstraction
- `backend/src/scripts/migrate-to-cockroach.js` - Migration script

---

## Environment Variables

```env
# SQLite (default)
DB_TYPE=sqlite
DB_PATH=./data/leadsync.db

# PostgreSQL / CockroachDB
DB_TYPE=postgres
DATABASE_URL=postgresql://username:password@host:port/database
```

---

## Common Issues

### Can't connect to CockroachDB?
- Check DATABASE_URL is correct
- Verify password has no spaces
- Confirm cluster is running

### Migration failed?
- Safe to re-run the script
- Uses ON CONFLICT to handle duplicates

### App not starting?
- Check DB_TYPE is set correctly
- Verify DATABASE_URL format
- Check npm packages installed

---

## Support

Full guide: See `COCKROACHDB_MIGRATION.md`

Questions? Check the logs:
```bash
npm start
# Look for: "🗄️  Database Type: POSTGRES"
```

---

## Free Tier Limits

- **Storage**: 5 GB
- **Requests**: 50M Request Units/month
- **Backups**: Automatic daily backups (7 days)

Perfect for small to medium production apps!

---

## Why CockroachDB?

✅ Free tier (no credit card required)
✅ Automatic scaling
✅ Built-in backups
✅ High availability
✅ PostgreSQL compatible
✅ Production-ready infrastructure

---

Made with ❤️ for LeadSync
