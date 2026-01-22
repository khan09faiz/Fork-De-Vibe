# Feature: Data Synchronization

## User Story

As a user, I want to manually sync my Spotify data so that my profile stays up-to-date.

## Sync Types

### 1. Automatic Sync (Cron)
Daily at 3 AM UTC, sync all users with recent activity.

### 2. Manual Sync (Button)
User-initiated sync with 1-hour cooldown.

## Data Synced

### Recently Played Tracks
```typescript
GET https://api.spotify.com/v1/me/player/recently-played?limit=50
```

Aggregate by date:
- Sum total minutes per day
- Identify top track per day
- Identify top artist per day
- Upsert into `daily_listening` table

### Top Artists
```typescript
GET https://api.spotify.com/v1/me/top/artists?time_range={range}&limit=20
```

Fetch for all three time ranges:
- `short_term` (4 weeks)
- `medium_term` (6 months)
- `long_term` (all time)

### Top Tracks
```typescript
GET https://api.spotify.com/v1/me/top/tracks?time_range={range}&limit=20
```

Same time ranges as artists.

## Implementation

### Sync Endpoint

```typescript
// app/api/spotify/sync/route.ts
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Check cooldown
  const lastSync = await getLastSync(session.user.id);
  if (lastSync && Date.now() - lastSync.getTime() < 3600000) {
    return NextResponse.json({ error: 'Please wait 1 hour' }, { status: 429 });
  }
  
  // Fetch from Spotify
  const recentTracks = await fetchRecentlyPlayed(session.accessToken);
  const topArtists = await fetchTopArtists(session.accessToken);
  const topTracks = await fetchTopTracks(session.accessToken);
  
  // Process and save
  await aggregateListening(session.user.id, recentTracks);
  await saveTopArtists(session.user.id, topArtists);
  await saveTopTracks(session.user.id, topTracks);
  
  // Recompute personality
  await computePersonality(session.user.id);
  
  return NextResponse.json({ success: true });
}
```

### Aggregation Logic

```typescript
async function aggregateListening(userId: string, tracks: Track[]) {
  const byDate = new Map<string, {
    minutes: number;
    trackCounts: Map<string, number>;
    artistCounts: Map<string, number>;
  }>();
  
  tracks.forEach(track => {
    const date = track.played_at.split('T')[0];
    const entry = byDate.get(date) || {
      minutes: 0,
      trackCounts: new Map(),
      artistCounts: new Map()
    };
    
    entry.minutes += track.duration_ms / 60000;
    entry.trackCounts.set(track.id, (entry.trackCounts.get(track.id) || 0) + 1);
    entry.artistCounts.set(track.artists[0].id, 
      (entry.artistCounts.get(track.artists[0].id) || 0) + 1);
    
    byDate.set(date, entry);
  });
  
  // Upsert each day
  for (const [date, data] of byDate) {
    const topTrack = Array.from(data.trackCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    const topArtist = Array.from(data.artistCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    await db.dailyListening.upsert({
      where: { userId_date: { userId, date } },
      update: { minutes: data.minutes, topTrackId: topTrack, topArtistId: topArtist },
      create: { userId, date, minutes: data.minutes, topTrackId: topTrack, topArtistId: topArtist }
    });
  }
}
```

### Cron Job

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-all",
    "schedule": "0 3 * * *"
  }]
}
```

```typescript
// app/api/cron/sync-all/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get users with recent activity (synced in last 7 days)
  const users = await db.user.findMany({
    where: {
      dailyListening: {
        some: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }
    }
  });
  
  // Sync each user
  for (const user of users) {
    try {
      await syncUser(user.id);
    } catch (error) {
      console.error(`Failed to sync user ${user.id}:`, error);
    }
  }
  
  return NextResponse.json({ synced: users.length });
}
```

## UI

### Sync Button

```typescript
<button onClick={handleSync} disabled={isSyncing}>
  {isSyncing ? 'Syncing...' : 'Sync Data'}
</button>
```

### Cooldown Display

```typescript
{lastSync && (
  <p>Last synced {formatDistanceToNow(lastSync)} ago</p>
)}
```

## Acceptance Criteria

- Manual sync button works
- 1-hour cooldown enforced
- Loading state during sync
- Success/error toasts
- Daily cron runs at 3 AM
- Only syncs active users
- Personality recalculated after sync

## Edge Cases

See [Edge Cases: Spotify API](../edge-cases/spotify-api.md)

**Last Updated:** January 22, 2026
