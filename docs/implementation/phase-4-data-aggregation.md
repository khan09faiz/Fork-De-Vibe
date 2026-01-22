# Phase 4: Data Aggregation & Storage

**Duration:** 3 hours  
**Prerequisites:** Phase 3 complete

## Goals

- Aggregate recently played into daily listening
- Save top artists and tracks to database
- Implement sync endpoint
- Add caching logic
- Test data persistence

## Step 1: Listening Aggregation

Create `lib/utils/aggregate-listening.ts`:

```typescript
import { db } from '@/lib/db';

interface RecentTrack {
  trackId: string;
  artistId: string;
  durationMs: number;
  playedAt: string;
}

export async function aggregateListening(userId: string, tracks: RecentTrack[]) {
  const byDate = new Map<string, {
    minutes: number;
    trackCounts: Map<string, number>;
    artistCounts: Map<string, number>;
  }>();

  tracks.forEach(track => {
    const date = track.playedAt.split('T')[0];
    
    if (!byDate.has(date)) {
      byDate.set(date, {
        minutes: 0,
        trackCounts: new Map(),
        artistCounts: new Map()
      });
    }

    const entry = byDate.get(date)!;
    entry.minutes += track.durationMs / 60000;
    entry.trackCounts.set(track.trackId, (entry.trackCounts.get(track.trackId) || 0) + 1);
    entry.artistCounts.set(track.artistId, (entry.artistCounts.get(track.artistId) || 0) + 1);
  });

  for (const [date, data] of byDate) {
    const topTrack = Array.from(data.trackCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    const topArtist = Array.from(data.artistCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    await db.dailyListening.upsert({
      where: {
        userId_date: { userId, date }
      },
      update: {
        minutes: Math.round(data.minutes),
        topTrackId: topTrack,
        topArtistId: topArtist
      },
      create: {
        userId,
        date,
        minutes: Math.round(data.minutes),
        topTrackId: topTrack,
        topArtistId: topArtist
      }
    });
  }

  return byDate.size;
}
```

## Step 2: Save Top Artists

Create `lib/utils/save-top-artists.ts`:

```typescript
import { db } from '@/lib/db';

interface TopArtist {
  spotifyId: string;
  name: string;
  genres: string[];
  imageUrl: string | null;
  popularity: number;
  timeRange: string;
  rank: number;
}

export async function saveTopArtists(userId: string, artists: TopArtist[]) {
  await db.userTopArtist.deleteMany({
    where: {
      userId,
      timeRange: artists[0]?.timeRange
    }
  });

  await db.userTopArtist.createMany({
    data: artists.map(artist => ({
      userId,
      ...artist
    }))
  });

  return artists.length;
}
```

## Step 3: Save Top Tracks

Create `lib/utils/save-top-tracks.ts`:

```typescript
import { db } from '@/lib/db';

interface TopTrack {
  spotifyId: string;
  name: string;
  artistName: string;
  albumName: string;
  imageUrl: string | null;
  previewUrl: string | null;
  timeRange: string;
  rank: number;
}

export async function saveTopTracks(userId: string, tracks: TopTrack[]) {
  await db.userTopTrack.deleteMany({
    where: {
      userId,
      timeRange: tracks[0]?.timeRange
    }
  });

  await db.userTopTrack.createMany({
    data: tracks.map(track => ({
      userId,
      ...track
    }))
  });

  return tracks.length;
}
```

## Step 4: Sync Endpoint

Create `app/api/spotify/sync/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { fetchRecentlyPlayed } from '@/lib/spotify/recently-played';
import { fetchTopArtists } from '@/lib/spotify/top-artists';
import { fetchTopTracks } from '@/lib/spotify/top-tracks';
import { aggregateListening } from '@/lib/utils/aggregate-listening';
import { saveTopArtists } from '@/lib/utils/save-top-artists';
import { saveTopTracks } from '@/lib/utils/save-top-tracks';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lastSync = await db.dailyListening.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    if (lastSync && Date.now() - lastSync.createdAt.getTime() < 3600000) {
      return NextResponse.json(
        { error: 'Please wait 1 hour between syncs' },
        { status: 429 }
      );
    }

    const recentTracks = await fetchRecentlyPlayed(session.accessToken);
    const daysAggregated = await aggregateListening(session.user.id, recentTracks);

    const timeRanges = ['short_term', 'medium_term', 'long_term'] as const;
    let totalArtists = 0;
    let totalTracks = 0;

    for (const timeRange of timeRanges) {
      const artists = await fetchTopArtists(session.accessToken, timeRange);
      totalArtists += await saveTopArtists(session.user.id, artists);

      const tracks = await fetchTopTracks(session.accessToken, timeRange);
      totalTracks += await saveTopTracks(session.user.id, tracks);
    }

    return NextResponse.json({
      success: true,
      daysAggregated,
      artistsSaved: totalArtists,
      tracksSaved: totalTracks
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Step 5: Cache Check Utilities

Create `lib/utils/cache.ts`:

```typescript
import { db } from '@/lib/db';

export async function getCachedTopArtists(
  userId: string,
  timeRange: string,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000
) {
  const cached = await db.userTopArtist.findMany({
    where: { userId, timeRange },
    orderBy: { rank: 'asc' }
  });

  if (cached.length === 0) return null;

  const age = Date.now() - cached[0].createdAt.getTime();
  if (age > maxAgeMs) return null;

  return cached;
}

export async function getCachedTopTracks(
  userId: string,
  timeRange: string,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000
) {
  const cached = await db.userTopTrack.findMany({
    where: { userId, timeRange },
    orderBy: { rank: 'asc' }
  });

  if (cached.length === 0) return null;

  const age = Date.now() - cached[0].createdAt.getTime();
  if (age > maxAgeMs) return null;

  return cached;
}

export async function getListeningHistory(
  userId: string,
  days = 365
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db.dailyListening.findMany({
    where: {
      userId,
      date: {
        gte: startDate.toISOString().split('T')[0]
      }
    },
    orderBy: { date: 'asc' }
  });
}
```

## Step 6: Sync UI Component

Create `components/SyncButton.tsx`:

```typescript
'use client';

import { useState } from 'react';

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSync() {
    setIsSyncing(true);
    setMessage('');

    try {
      const res = await fetch('/api/spotify/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setMessage(`Synced ${data.daysAggregated} days of listening data`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSyncing ? 'Syncing...' : 'Sync Spotify Data'}
      </button>
      {message && (
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
      )}
    </div>
  );
}
```

## Step 7: Add to Dashboard

Update `app/dashboard/page.tsx`:

```typescript
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SyncButton } from '@/components/SyncButton';
import { getListeningHistory } from '@/lib/utils/cache';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const history = await getListeningHistory(user.id, 7);
  const totalMinutes = history.reduce((sum, day) => sum + day.minutes, 0);

  return (
    <div className="min-h-screen bg-bg-dark p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>
      
      <div className="bg-bg-secondary rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Listening Stats (Last 7 Days)</h2>
        <p className="text-4xl font-bold text-primary">{totalMinutes} minutes</p>
        <p className="text-text-secondary mt-2">{history.length} days with activity</p>
      </div>

      <div className="bg-bg-secondary rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Sync Data</h2>
        <p className="text-text-secondary mb-4">
          Pull your latest listening data from Spotify
        </p>
        <SyncButton />
      </div>
    </div>
  );
}
```

## Checklist

- [ ] Listening aggregation working
- [ ] Top artists saved to database
- [ ] Top tracks saved to database
- [ ] Sync endpoint functional
- [ ] 1-hour cooldown enforced
- [ ] Cache utilities created
- [ ] Sync button added to dashboard
- [ ] Data persists after sync

## Testing

1. Click "Sync Spotify Data" button
2. Wait for sync to complete
3. Check Prisma Studio for data:
   - `daily_listening` table has rows
   - `user_top_artists` table has 60 rows (20 per time range)
   - `user_top_tracks` table has 60 rows
4. Try syncing again immediately - should get cooldown error
5. Verify cached data can be retrieved

## Common Issues

**Issue:** Duplicate entries
**Solution:** Check upsert logic has correct unique constraints

**Issue:** Missing data
**Solution:** User may not have enough Spotify history

**Issue:** Sync takes too long
**Solution:** Reduce API calls, add loading states

## Next Phase

Continue to [Phase 5: Profile Page](phase-5-profile-page.md)

**Last Updated:** January 22, 2026
