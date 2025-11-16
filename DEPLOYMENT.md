# LeadSync Deployment Guide

## Quick Deploy to Production

### Backend (Render.com)

1. Push code to GitHub
2. Connect Render to your repository
3. Create new Web Service
4. Select `backend` as root directory
5. Set environment variables from `.env.example`
6. Deploy!

**Environment Variables Required:**
- `JWT_SECRET` - Secure random string (can auto-generate on Render)
- `ANTHROPIC_API_KEY` - Your Claude API key
- `EMAIL_USER` - Gmail address
- `EMAIL_PASSWORD` - Gmail app-specific password
- `FRONTEND_URL` - Your frontend URL (e.g., https://leadsync.vercel.app)

**Optional Environment Variables:**
- `GOOGLE_CLIENT_ID` - For Google Calendar integration
- `GOOGLE_CLIENT_SECRET` - For Google Calendar integration
- `GOOGLE_REDIRECT_URI` - OAuth callback URL
- `GHL_API_KEY` - For GoHighLevel integration

### Frontend (Vercel)

1. Push code to GitHub
2. Import project to Vercel
3. Set root directory to `frontend`
4. Set build command: `npm run build`
5. Set output directory: `build`
6. Set environment variable: `REACT_APP_API_URL=https://your-backend.onrender.com`
7. Deploy!

### Database

LeadSync uses SQLite which is file-based. On Render:
- Enable persistent disk storage (1GB is plenty)
- Mount at `/opt/render/project/src/backend`
- Migrations run automatically on deploy via `migrate.js`

**Important:** Ensure the disk is properly configured to avoid data loss on deploys!

### Custom Domain

**Backend:**
1. Add custom domain in Render dashboard
2. Update CORS settings if needed
3. Update `FRONTEND_URL` env var to match your frontend domain

**Frontend:**
1. Add custom domain in Vercel dashboard
2. Configure DNS settings as instructed by Vercel
3. Update `REACT_APP_API_URL` to point to your backend domain

## Post-Deployment Checklist

After deploying, verify everything works:

- [ ] Backend health check: `GET https://your-backend.com/api/health`
- [ ] Frontend loads and shows login page
- [ ] Can register a new user
- [ ] Can log in with new user
- [ ] Can create a new strategy
- [ ] Can test AI conversation
- [ ] Can create a lead
- [ ] Can book an appointment (if calendar configured)
- [ ] Can view analytics dashboard
- [ ] Toast notifications work
- [ ] Email notifications sent (if configured)

## Environment-Specific Configuration

### Development
```bash
cd backend
cp .env.example .env
# Edit .env with your keys
npm install
npm run migrate
npm run dev
```

```bash
cd frontend
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:3001
npm install
npm start
```

### Production

**Backend:**
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Enable HTTPS only
- Configure rate limiting (already included)
- Use production email service

**Frontend:**
- Build optimized production bundle
- Enable gzip compression
- Configure CDN (Vercel does this automatically)
- Set proper `REACT_APP_API_URL`

## Monitoring

### Render
- View logs: Render Dashboard → Your Service → Logs
- Check health: Monitor the `/api/health` endpoint
- View metrics: Dashboard → Metrics tab

### Vercel
- View build logs: Vercel Dashboard → Deployments → Logs
- Check analytics: Dashboard → Analytics
- Monitor performance: Dashboard → Speed Insights

## Backup & Recovery

### Database Backup
SQLite database is stored on Render's persistent disk:
1. Go to Render Dashboard
2. Navigate to Disks
3. Click on `leadsync-data`
4. Download backup file

**Automated Backups:**
Render automatically backs up persistent disks. You can restore from any backup point.

### Manual Backup
```bash
# Download from Render shell
render shell
cp leadsync.db /tmp/backup.db
# Download /tmp/backup.db via Render dashboard
```

## Troubleshooting

### Backend won't start
1. Check environment variables are set
2. Verify `JWT_SECRET` is configured
3. Check database migrations ran successfully
4. Review logs for specific errors

### Frontend can't connect to backend
1. Verify `REACT_APP_API_URL` is correct
2. Check CORS is configured properly in backend
3. Ensure backend is running and healthy
4. Check browser console for specific errors

### AI not responding
1. Verify `ANTHROPIC_API_KEY` is valid
2. Check API credits remaining
3. Review backend logs for API errors
4. Ensure proper API key format (sk-ant-api03-...)

### Database errors
1. Check persistent disk is mounted correctly
2. Verify migrations ran successfully
3. Check disk space isn't full
4. Review database file permissions

### Email not sending
1. Verify Gmail credentials are correct
2. Use app-specific password (not regular password)
3. Check Gmail security settings allow less secure apps
4. Review backend logs for SMTP errors

## Security Best Practices

1. **Never commit `.env` files to git**
2. Use strong, unique `JWT_SECRET` in production
3. Enable HTTPS only (Render/Vercel do this automatically)
4. Regularly rotate API keys and secrets
5. Monitor rate limiting logs for suspicious activity
6. Keep dependencies updated (`npm audit`)
7. Review and limit CORS allowed origins
8. Use environment-specific configurations

## Scaling

### Backend Scaling
Render auto-scales based on load:
- Upgrade to larger instance type if needed
- Enable auto-scaling in settings
- Monitor response times and adjust

### Database Scaling
SQLite is great for small-medium workloads:
- For high traffic, consider migrating to PostgreSQL
- Current SQLite setup handles ~100-1000 users well
- Monitor disk usage and upgrade disk size if needed

### Frontend Scaling
Vercel CDN handles scaling automatically:
- Global edge network
- Automatic caching
- Unlimited bandwidth

## Cost Estimates

**Render (Backend):**
- Free tier: $0/month (with limitations)
- Starter: $7/month (recommended)
- Persistent disk: $0.25/GB/month

**Vercel (Frontend):**
- Hobby: $0/month (generous limits)
- Pro: $20/month (for commercial use)

**Total estimated cost:** $7-27/month depending on plan

## Support

For deployment issues:
- Render docs: https://render.com/docs
- Vercel docs: https://vercel.com/docs
- LeadSync issues: [GitHub repository]

---

**Last updated:** 2025-11-14
