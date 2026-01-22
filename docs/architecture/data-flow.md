# Data Flow & Caching

**Purpose:** Request flows, caching strategies, and data synchronization

---

## Profile Page Load Flow

### Initial Request

```
1. User visits /{username}
   ↓
2. Next.js checks ISR cache (TTL: 1 hour)
   ↓
3. If cache HIT → Return cached HTML immediately
   ↓
4. If cache MISS or expired:
   - Fetch user from database
   - Check privacy settings
   - Fetch top artists/tracks
   - Fetch listening history
   - Fetch personality data
   ↓
5. Render Server Component
   ↓
6. Send HTML to client
   ↓
7. Cache page for 1 hour (ISR)
```

### ISR Configuration

```typescript
// app/[username]/page.tsx
export const revalidate = 3600; // 1 hour in seconds

export default async function ProfilePage({ params }) {
  const user = await db.user.findUnique({
    where: { username: params.username }
  });
  
  // ... fetch data and render
}
```

---

## Data Sync Flow

### Manual Sync Trigger

```
1. User clicks "Sync Data" button
   ↓
2. Client sends POST /api/spotify/sync
   ↓
3. Server validates session
   ↓
4. Check last sync time (rate limit: 1 hour)
   ↓
5. If too soon → Return 429 error
   ↓
6. Fetch recently-played from Spotify (50 tracks)
   ↓
7. Aggregate tracks by date (user's timezone)
   ↓
8. Group by date, calculate:
   - Total minutes
   - Top artist
   - Top track
   ↓
9. Upsert to daily_listening table
   ↓
10. Fetch top artists (3 time ranges)
    ↓
11. Save to user_top_artists table
    ↓
12. Fetch top tracks (3 time ranges)
    ↓
13. Save to user_top_tracks table
    ↓
14. Compute personality metrics
    ↓
15. Save to music_personality table
    ↓
16. Revalidate profile cache (ISR)
    ↓
17. Return success response
```

### Sync API Endpoint

```typescript
// app/api/spotify/sync/route.ts
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limiting
  const lastSync = await db.dailyListening.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });

  if (lastSync) {
    const hoursSince = (Date.now() - lastSync.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 1) {
      return NextResponse.json(
        { error: 'Rate limit: Sync once per hour' },
        { status: 429 }
      );
    }
  }

  // Fetch and aggregate data
  const recentTracks = await fetchRecentlyPlayed(session.accessToken);
  const aggregated = aggregateByDate(recentTracks, session.user.timezone);

  // Save to database
  for (const day of aggregated) {
    await db.dailyListening.upsert({
      where: { userId_date: { userId: session.user.id, date: day.date } },
      update: { minutes: day.minutes, topArtistId: day.topArtistId },
      create: { userId: session.user.id, ...day }
    });
  }

  // Fetch top data
  await syncTopArtists(session.user.id, session.accessToken);
  await syncTopTracks(session.user.id, session.accessToken);

  // Compute metrics
  await computeAllMetrics(session.user.id);

  // Revalidate cache
  revalidatePath(`/[username]`, 'page');

  return NextResponse.json({ success: true });
}
```

---

## Caching Strategy

### Layer 1: ISR (Next.js)

**What:** Incremental Static Regeneration  
**TTL:** 1 hour  
**Purpose:** Reduce database load, fast page loads

```typescript
export const revalidate = 3600;
```

**Revalidation Triggers:**
- Time-based (1 hour)
- Manual revalidation after sync
- On-demand via revalidatePath()

---

### Layer 2: Database (PostgreSQL)

**What:** Persistent storage  
**TTL:** Permanent (until updated)  
**Purpose:** Source of truth

**Data Freshness:**
- Top Artists/Tracks: Updated on sync (user-initiated)
- Daily Listening: Updated on sync
- Personality: Computed on sync

---

### Layer 3: Spotify API Response Cache

**What:** In-memory or Redis cache (future)  
**TTL:** Varies by endpoint  
**Purpose:** Respect rate limits

```typescript
const CACHE_TTL = {
  TOP_ARTISTS: 7 * 24 * 60 * 60 * 1000,   // 7 days
  TOP_TRACKS: 7 * 24 * 60 * 60 * 1000,    // 7 days
  RECENTLY_PLAYED: 24 * 60 * 60 * 1000    // 1 day
};

async function getCachedTopArtists(userId: string, timeRange: string) {
  const cached = await db.userTopArtist.findMany({
    where: { userId, timeRange },
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  if (cached[0] && Date.now() - cached[0].createdAt.getTime() < CACHE_TTL.TOP_ARTISTS) {
    return cached;
  }

  // Cache miss - fetch from Spotify
  return await fetchFromSpotify(userId, timeRange);
}
```

---

## Authentication Flow

### OAuth Flow

```
1. User clicks "Sign in with Spotify"
   ↓
2. Redirect to Spotify OAuth page
   https://accounts.spotify.com/authorize?
     client_id=...
     redirect_uri=...
     scope=user-read-email user-top-read...
   ↓
3. User authorizes app
   ↓
4. Spotify redirects to callback URL with auth code
   /api/auth/callback/spotify?code=...
   ↓
5. NextAuth exchanges code for tokens
   - Access token (1 hour)
   - Refresh token (indefinite)
   ↓
6. Fetch user profile from Spotify
   ↓
7. Create or update user in database
   ↓
8. Generate session JWT
   ↓
9. Set HTTP-only cookie
   ↓
10. Redirect to profile page
```

### Token Refresh Flow

```
1. Access token expires (after ~1 hour)
   ↓
2. API call returns 401
   ↓
3. NextAuth detects expired token
   ↓
4. Call Spotify token refresh endpoint
   POST https://accounts.spotify.com/api/token
   Body: grant_type=refresh_token&refresh_token=...
   ↓
5. Receive new access token
   ↓
6. Update session JWT
   ↓
7. Retry original API call
```

### Session Management

```typescript
// NextAuth JWT callback
async jwt({ token, account }) {
  if (account) {
    token.accessToken = account.access_token;
    token.refreshToken = account.refresh_token;
    token.accessTokenExpires = Date.now() + account.expires_in * 1000;
  }

  // Token still valid
  if (Date.now() < token.accessTokenExpires) {
    return token;
  }

  // Token expired - refresh
  return refreshAccessToken(token);
}
```

---

## Database Query Patterns

### Get User Profile (Optimized)

```typescript
const profile = await db.user.findUnique({
  where: { username: params.username },
  include: {
    personality: true,
    topArtists: {
      where: { timeRange: 'short_term' },
      orderBy: { rank: 'asc' },
      take: 20
    },
    topTracks: {
      where: { timeRange: 'short_term' },
      orderBy: { rank: 'asc' },
      take: 20
    },
    dailyListening: {
      where: {
        date: { gte: getDateDaysAgo(365) }
      },
      orderBy: { date: 'asc' }
    }
  }
});
```

### Bulk Upsert (Daily Listening)

```typescript
const operations = days.map(day =>
  db.dailyListening.upsert({
    where: {
      userId_date: { userId, date: day.date }
    },
    update: { minutes: day.minutes, topArtistId: day.topArtistId },
    create: { userId, ...day }
  })
);

await Promise.all(operations);
```

---

## Background Jobs (Future)

### Cron Jobs on Vercel

**Daily Sync (All Users)**
```
Schedule: 0 2 * * * (2 AM UTC)
Endpoint: /api/cron/sync-all
Action: Sync data for all active users
```

**Weekly Top Data Refresh**
```
Schedule: 0 3 * * 1 (3 AM Monday)
Endpoint: /api/cron/refresh-top-data
Action: Update top artists/tracks for all users
```

**Configuration (vercel.json)**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-all",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Performance Optimization

### Query Optimization

1. **Use indexes** - All foreign keys indexed
2. **Limit results** - Use `take` to limit query size
3. **Select specific fields** - Don't fetch unused data
4. **Batch operations** - Use Promise.all for parallel queries

### Caching Best Practices

1. **Cache at edge** - ISR for profile pages
2. **Cache in database** - Top data stored, not fetched every time
3. **Invalidate strategically** - Only revalidate after sync
4. **Respect rate limits** - Cache Spotify API responses

---

**Last Updated:** January 22, 2026
