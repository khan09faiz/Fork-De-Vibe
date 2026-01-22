# Deployment Guide

**Purpose:** Step-by-step deployment to production

---

## Prerequisites

- [ ] GitHub repository with code
- [ ] Vercel account (free tier works)
- [ ] Spotify Developer App created
- [ ] PostgreSQL database (Supabase/Railway/Vercel Postgres)

---

## Spotify App Configuration

### Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in details:
   - App Name: TuneHub
   - App Description: Music listening profile
   - Redirect URI: `https://your-domain.com/api/auth/callback/spotify`
4. Save Client ID and Client Secret

### Required Scopes

```
user-read-email
user-read-private
user-top-read
user-read-recently-played
```

---

## Database Setup

### Option 1: Supabase (Recommended)

**Why:** Free tier, automatic backups, connection pooling

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy database connection string:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Replace `[PASSWORD]` with your project password

### Option 2: Railway

**Why:** Simple deployment, built-in PostgreSQL

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Copy `DATABASE_URL` from variables tab

### Option 3: Vercel Postgres

**Why:** Integrated with Vercel deployment

1. In Vercel dashboard, go to Storage tab
2. Create Postgres database
3. Copy connection string

---

## Vercel Deployment

### Initial Deployment

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/repo.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import GitHub repository
   - Select framework: Next.js

3. **Configure Environment Variables**
   
   Click "Environment Variables" and add:
   
   ```bash
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=<generate-with-openssl>
   SPOTIFY_CLIENT_ID=<from-spotify-dashboard>
   SPOTIFY_CLIENT_SECRET=<from-spotify-dashboard>
   ```

   Generate NEXTAUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)

---

## Post-Deployment Setup

### Database Migration

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Link project**
   ```bash
   vercel link
   ```

3. **Pull environment variables**
   ```bash
   vercel env pull .env.local
   ```

4. **Run migrations**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### Update Spotify Redirect URI

1. Go to Spotify Developer Dashboard
2. Edit your app
3. Add redirect URI:
   ```
   https://your-domain.vercel.app/api/auth/callback/spotify
   ```
4. Save changes

---

## Custom Domain (Optional)

1. In Vercel dashboard, go to Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```
4. Update Spotify redirect URI to new domain
5. Update NEXTAUTH_URL environment variable

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| NEXTAUTH_URL | Full app URL | `https://tunehub.vercel.app` |
| NEXTAUTH_SECRET | Random secret for JWT | `openssl rand -base64 32` |
| SPOTIFY_CLIENT_ID | From Spotify Dashboard | `abc123...` |
| SPOTIFY_CLIENT_SECRET | From Spotify Dashboard | `xyz789...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | `production` |
| LOG_LEVEL | Logging verbosity | `info` |

---

## Monitoring & Logging

### Vercel Analytics

1. Go to Vercel dashboard > Analytics
2. View:
   - Page views
   - Response times
   - Error rates

### Database Monitoring

**Supabase:**
- Dashboard > Database > Performance
- View query performance, active connections

**Railway:**
- Project > Metrics
- CPU, memory, network usage

---

## Performance Optimization

### Enable Caching

ISR already configured:
```typescript
export const revalidate = 3600; // 1 hour
```

### Image Optimization

Use Next.js Image component:
```tsx
import Image from 'next/image';

<Image
  src={artist.imageUrl}
  alt={artist.name}
  width={200}
  height={200}
  loading="lazy"
/>
```

### Bundle Size

Check bundle size:
```bash
npm run build
```

Optimize imports:
```typescript
// ❌ Don't do this
import _ from 'lodash';

// ✅ Do this
import debounce from 'lodash/debounce';
```

---

## Continuous Deployment

### Auto-Deploy on Push

Vercel automatically deploys on:
- Push to `main` branch → Production
- Push to other branches → Preview deployments

### Environment-Specific Variables

**Production:**
```bash
vercel env add DATABASE_URL production
```

**Preview:**
```bash
vercel env add DATABASE_URL preview
```

**Development:**
```bash
vercel env add DATABASE_URL development
```

---

## Backup Strategy

### Database Backups

**Supabase:**
- Automatic daily backups (free tier)
- Manual backups via Dashboard > Database > Backups

**Railway:**
- Automatic backups (Pro plan)
- Manual export:
  ```bash
  pg_dump $DATABASE_URL > backup.sql
  ```

### Code Backups

- Git repository (GitHub)
- Vercel deployments (rollback available)

---

## Rollback Procedure

### Rollback Deployment

1. Go to Vercel dashboard > Deployments
2. Find previous working deployment
3. Click "..." menu > Promote to Production

### Rollback Database Migration

```bash
npx prisma migrate resolve --rolled-back <migration-name>
npx prisma migrate deploy
```

---

## Troubleshooting

### Build Fails

**Error: Module not found**
```bash
npm install
npm run build # Test locally
```

**Error: Environment variable missing**
- Check Vercel dashboard > Settings > Environment Variables
- Redeploy after adding variables

### Database Connection Issues

**Error: Can't reach database**
- Check DATABASE_URL format
- Verify database is running
- Check IP whitelist (if applicable)

**Error: SSL required**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For migrations
  relationMode = "prisma"
}
```

### Spotify OAuth Errors

**Error: Invalid redirect URI**
- Ensure redirect URI in Spotify Dashboard matches exactly
- Include `/api/auth/callback/spotify` path

**Error: Invalid client**
- Verify SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
- Check for extra spaces or newlines

---

## Security Checklist

- [ ] NEXTAUTH_SECRET is strong and random
- [ ] DATABASE_URL is not exposed in client code
- [ ] Spotify Client Secret is not in repository
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] Environment variables set in Vercel dashboard
- [ ] Database has strong password
- [ ] Rate limiting implemented
- [ ] CORS configured properly

---

## Production Testing

### Manual Tests

1. Sign in with Spotify ✓
2. Sync data ✓
3. View profile (public) ✓
4. Edit README ✓
5. Toggle privacy ✓
6. View another user's profile ✓

### Automated Tests (Future)

```bash
npm run test
npm run test:e2e
```

---

## Cost Estimate

### Free Tier

- **Vercel:** Free (Hobby plan, unlimited deployments)
- **Supabase:** Free (500MB database, 2GB bandwidth)
- **GitHub:** Free (public repositories)
- **Spotify API:** Free (rate limits: 180 requests/min)

### Paid Tier (If Needed)

- **Vercel Pro:** $20/month (custom domains, analytics)
- **Supabase Pro:** $25/month (8GB database, 50GB bandwidth)
- **Railway:** $5/month (500 hours compute)

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs in Vercel dashboard

**Weekly:**
- Check database size (Supabase dashboard)
- Review API usage (Spotify dashboard)

**Monthly:**
- Update dependencies:
  ```bash
  npm outdated
  npm update
  ```
- Review and rotate secrets

---

## Support Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Spotify API Docs](https://developer.spotify.com/documentation/web-api)

---

**Last Updated:** January 22, 2026
