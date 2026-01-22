# Phase 8: Polish & Deploy

**Duration:** 2 hours  
**Prerequisites:** Phase 7 complete

## Goals

- Add loading states and error handling
- Implement proper error boundaries
- Add animations and transitions
- Test all functionality
- Deploy to Vercel
- Configure production environment

## Step 1: Error Boundary

Create `components/ErrorBoundary.tsx`:

```typescript
'use client';

import { useEffect } from 'react';

export function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-bg-secondary rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
        <p className="text-text-secondary mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
```

Create `app/error.tsx`:

```typescript
'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default ErrorBoundary;
```

## Step 2: Loading States

Create `app/loading.tsx`:

```typescript
export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}
```

Create `app/[username]/loading.tsx`:

```typescript
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-bg-dark p-8">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="bg-bg-secondary rounded-lg p-6 h-32" />
          <div className="bg-bg-secondary rounded-lg p-6 h-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-bg-secondary rounded-lg h-96" />
            <div className="bg-bg-secondary rounded-lg h-96" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Step 3: Toast Notifications

Create `components/Toast.tsx`:

```typescript
'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContext = createContext<{
  showToast: (message: string, type: Toast['type']) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-6 py-4 rounded-lg shadow-lg text-white ${
              toast.type === 'success' ? 'bg-primary' :
              toast.type === 'error' ? 'bg-error' : 'bg-info'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
```

## Step 4: Update Root Layout

Update `app/layout.tsx`:

```typescript
import { Providers } from './providers';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

export const metadata = {
  title: 'TuneHub - Your Music Identity',
  description: 'Share your music taste with the world'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg-dark text-text-primary antialiased">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
```

## Step 5: Final Testing Checklist

Create testing checklist:

```markdown
## Authentication
- [ ] Sign in with Spotify works
- [ ] Session persists after refresh
- [ ] Token refresh works
- [ ] Sign out clears session

## Data Sync
- [ ] Sync button works
- [ ] 1-hour cooldown enforced
- [ ] All data saved to database
- [ ] Metrics computed after sync

## Profile Page
- [ ] Public profiles accessible
- [ ] Private profiles return 404
- [ ] Owner sees private profile with banner
- [ ] All components display data
- [ ] Mobile responsive

## Components
- [ ] Listening graph shows 365 days
- [ ] Time range tabs work
- [ ] Images load correctly
- [ ] Personality metrics accurate
- [ ] Loyalty streaks correct

## Settings
- [ ] Privacy toggle works
- [ ] README editor saves
- [ ] Preview mode works
- [ ] Character limit enforced

## Edge Cases
- [ ] No data states handled
- [ ] Error messages clear
- [ ] Loading states shown
- [ ] Rate limiting works
```

## Step 6: Deploy to Vercel

### A. Push to GitHub

```bash
git add .
git commit -m "Complete TuneHub implementation"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### B. Connect to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework: Next.js
   - Build Command: `prisma generate && next build`
   - Install Command: `npm ci`

### C. Environment Variables

Add to Vercel:

```
DATABASE_URL=<production-database-url>
NEXTAUTH_URL=https://tunehub.vercel.app
NEXTAUTH_SECRET=<production-secret>
SPOTIFY_CLIENT_ID=<production-client-id>
SPOTIFY_CLIENT_SECRET=<production-client-secret>
```

### D. Update Spotify Redirect URI

Add to Spotify Dashboard:
- `https://tunehub.vercel.app/api/auth/callback/spotify`

## Step 7: Production Database

### Option A: Supabase (Recommended)

1. Create account at https://supabase.com
2. Create new project
3. Copy connection string
4. Add to Vercel environment variables
5. Run migrations:

```bash
DATABASE_URL=<supabase-url> npx prisma migrate deploy
```

### Option B: Railway

1. Create account at https://railway.app
2. Create PostgreSQL database
3. Copy connection string
4. Add to Vercel environment variables
5. Run migrations

## Step 8: Post-Deployment

### A. Verify Deployment

1. Visit deployed URL
2. Test authentication flow
3. Sync data
4. Check profile page
5. Test all features

### B. Monitor Errors

Check Vercel logs:
```bash
vercel logs <deployment-url>
```

### C. Set Up Custom Domain (Optional)

1. Purchase domain
2. Add to Vercel project
3. Configure DNS records
4. Update NEXTAUTH_URL
5. Update Spotify redirect URI

## Step 9: Performance Optimization

### A. Analyze Bundle

```bash
ANALYZE=true npm run build
```

### B. Optimize Images

- Use next/image for all images
- Set proper sizes and quality
- Enable lazy loading

### C. Database Indexes

Verify indexes exist:

```sql
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_daily_listening_user_date ON daily_listening(user_id, date);
CREATE INDEX IF NOT EXISTS idx_top_artists_user_range ON user_top_artists(user_id, time_range);
```

## Step 10: Documentation

Create `README.md` in project root:

```markdown
# TuneHub

Your music identity on the web. Share your Spotify listening stats with the world.

## Features

- GitHub-style listening activity graph
- Top artists and tracks with time ranges
- Music personality analysis
- Artist loyalty streaks
- Customizable profile README
- Public/private profiles

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- PostgreSQL + Prisma
- NextAuth.js (Spotify OAuth)
- Tailwind CSS
- Vercel (Deployment)

## Local Development

1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations: `npx prisma migrate dev`
5. Start dev server: `npm run dev`

## License

MIT
```

## Checklist

- [ ] Error boundary implemented
- [ ] Loading states added
- [ ] Toast notifications working
- [ ] All features tested
- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Production database configured
- [ ] Environment variables set
- [ ] Spotify redirect URIs updated
- [ ] Deployment verified
- [ ] Performance optimized
- [ ] Documentation complete

## Troubleshooting

**Issue:** Build fails on Vercel
**Solution:** Check build logs, verify all dependencies installed

**Issue:** Database connection fails
**Solution:** Verify DATABASE_URL format, check connection pooling

**Issue:** Authentication not working
**Solution:** Verify NEXTAUTH_URL matches deployment URL

**Issue:** Images not loading
**Solution:** Check domains in next.config.js

## Next Steps

- Add analytics (Vercel Analytics, Plausible)
- Implement follow system
- Add social sharing features
- Create email notifications
- Build admin dashboard
- Add more personality metrics

**Congratulations! TuneHub is now live!**

**Last Updated:** January 22, 2026
