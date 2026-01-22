# Phase 7: Personality & Loyalty Calculations

**Duration:** 3 hours  
**Prerequisites:** Phase 6 complete

## Goals

- Implement personality calculation algorithm
- Calculate artist loyalty streaks
- Create computation endpoint
- Trigger calculations after sync
- Test accuracy of metrics

## Step 1: Personality Calculation

Create `lib/calculations/personality.ts`:

```typescript
import { db } from '@/lib/db';

export async function calculatePersonality(userId: string) {
  const [topArtists, topTracks, recentTracks] = await Promise.all([
    db.userTopArtist.findMany({
      where: { userId, timeRange: 'short_term' },
      orderBy: { rank: 'asc' }
    }),
    db.userTopTrack.findMany({
      where: { userId, timeRange: 'short_term' },
      orderBy: { rank: 'asc' }
    }),
    db.dailyListening.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 50
    })
  ]);

  const genres = topArtists.flatMap(a => a.genres);
  const genreDiversity = calculateGenreDiversity(genres);
  const repeatRate = calculateRepeatRate(recentTracks);
  const uniqueArtists = new Set(topArtists.map(a => a.spotifyId)).size;
  const avgPopularity = topArtists.reduce((sum, a) => sum + a.popularity, 0) / topArtists.length;

  const tags = assignTags(genreDiversity, repeatRate, avgPopularity);

  await db.musicPersonality.upsert({
    where: { userId },
    update: {
      tags,
      genreDiversity,
      repeatRate,
      uniqueArtists,
      computedAt: new Date()
    },
    create: {
      userId,
      tags,
      genreDiversity,
      repeatRate,
      uniqueArtists,
      longestStreak: 0,
      currentStreak: 0
    }
  });

  return { tags, genreDiversity, repeatRate, uniqueArtists };
}

function calculateGenreDiversity(genres: string[]): number {
  if (genres.length === 0) return 0;

  const counts = new Map<string, number>();
  genres.forEach(g => counts.set(g, (counts.get(g) || 0) + 1));

  const probabilities = Array.from(counts.values()).map(count => count / genres.length);
  const entropy = -probabilities.map(p => p * Math.log2(p)).reduce((sum, val) => sum + val, 0);

  return Math.min(entropy / Math.log2(genres.length), 1);
}

function calculateRepeatRate(dailyListening: any[]): number {
  const trackCounts = new Map<string, number>();
  
  dailyListening.forEach(day => {
    if (day.topTrackId) {
      trackCounts.set(day.topTrackId, (trackCounts.get(day.topTrackId) || 0) + 1);
    }
  });

  const repeatedTracks = Array.from(trackCounts.values()).filter(count => count > 1).length;
  return trackCounts.size > 0 ? repeatedTracks / trackCounts.size : 0;
}

function assignTags(genreDiversity: number, repeatRate: number, avgPopularity: number): string[] {
  const tags: string[] = [];

  if (genreDiversity > 0.7) tags.push('Explorer');
  else if (genreDiversity < 0.3) tags.push('Loyalist');

  if (repeatRate > 0.6) tags.push('Repeat Listener');
  else if (repeatRate < 0.3) tags.push('Discoverer');

  if (avgPopularity > 70) tags.push('Mainstream');
  else if (avgPopularity < 40) tags.push('Hipster');

  return tags;
}
```

## Step 2: Loyalty Streak Calculation

Create `lib/calculations/loyalty.ts`:

```typescript
import { db } from '@/lib/db';

export async function calculateArtistLoyalty(userId: string) {
  const dailyListening = await db.dailyListening.findMany({
    where: { userId },
    orderBy: { date: 'asc' }
  });

  if (dailyListening.length === 0) {
    return { longestStreak: 0, currentStreak: 0, streakArtist: null };
  }

  let longestStreak = 0;
  let longestStreakArtist: string | null = null;
  let currentStreak = 0;
  let currentStreakArtist: string | null = null;
  let prevArtist: string | null = null;

  for (const day of dailyListening) {
    if (!day.topArtistId) continue;

    if (day.topArtistId === prevArtist) {
      currentStreak++;
    } else {
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakArtist = prevArtist;
      }
      currentStreak = 1;
      prevArtist = day.topArtistId;
      currentStreakArtist = day.topArtistId;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
    longestStreakArtist = prevArtist;
  }

  const lastDate = new Date(dailyListening[dailyListening.length - 1].date);
  const today = new Date();
  const daysSinceLastListen = Math.floor(
    (today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysSinceLastListen > 1) {
    currentStreak = 0;
    currentStreakArtist = null;
  }

  const artistName = longestStreakArtist
    ? (await db.userTopArtist.findFirst({
        where: { userId, spotifyId: longestStreakArtist }
      }))?.name
    : null;

  await db.musicPersonality.upsert({
    where: { userId },
    update: {
      longestStreak,
      currentStreak,
      streakArtist: artistName
    },
    create: {
      userId,
      tags: [],
      genreDiversity: 0,
      repeatRate: 0,
      uniqueArtists: 0,
      longestStreak,
      currentStreak,
      streakArtist: artistName
    }
  });

  return { longestStreak, currentStreak, streakArtist: artistName };
}
```

## Step 3: Combined Computation

Create `lib/calculations/compute-all.ts`:

```typescript
import { calculatePersonality } from './personality';
import { calculateArtistLoyalty } from './loyalty';

export async function computeAllMetrics(userId: string) {
  try {
    const [personality, loyalty] = await Promise.all([
      calculatePersonality(userId),
      calculateArtistLoyalty(userId)
    ]);

    return {
      success: true,
      personality,
      loyalty
    };
  } catch (error) {
    console.error('Error computing metrics:', error);
    throw error;
  }
}
```

## Step 4: Update Sync Endpoint

Update `app/api/spotify/sync/route.ts`:

```typescript
import { computeAllMetrics } from '@/lib/calculations/compute-all';

export async function POST() {
  // ... existing sync code ...

  await computeAllMetrics(session.user.id);

  return NextResponse.json({
    success: true,
    daysAggregated,
    artistsSaved: totalArtists,
    tracksSaved: totalTracks
  });
}
```

## Step 5: Computation API Endpoint

Create `app/api/user/compute-metrics/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { computeAllMetrics } from '@/lib/calculations/compute-all';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await computeAllMetrics(session.user.id);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Computation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Step 6: Manual Compute Button

Create `components/ComputeButton.tsx`:

```typescript
'use client';

import { useState } from 'react';

export function ComputeButton() {
  const [isComputing, setIsComputing] = useState(false);
  const [message, setMessage] = useState('');

  async function handleCompute() {
    setIsComputing(true);
    setMessage('');

    try {
      const res = await fetch('/api/user/compute-metrics', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setMessage('Metrics computed successfully');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Computation failed');
    } finally {
      setIsComputing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCompute}
        disabled={isComputing}
        className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg disabled:opacity-50 transition-colors"
      >
        {isComputing ? 'Computing...' : 'Recompute Metrics'}
      </button>
      {message && (
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
      )}
    </div>
  );
}
```

## Step 7: Testing Script

Create `scripts/test-calculations.ts`:

```typescript
import { calculatePersonality } from '@/lib/calculations/personality';
import { calculateArtistLoyalty } from '@/lib/calculations/loyalty';

async function testCalculations() {
  const userId = 'test_user_id';

  console.log('Testing personality calculation...');
  const personality = await calculatePersonality(userId);
  console.log('Personality:', personality);

  console.log('\nTesting loyalty calculation...');
  const loyalty = await calculateArtistLoyalty(userId);
  console.log('Loyalty:', loyalty);

  console.log('\nTests completed!');
}

testCalculations().catch(console.error);
```

## Step 8: Add to Dashboard

Update `app/dashboard/page.tsx`:

```typescript
import { ComputeButton } from '@/components/ComputeButton';

// Add to dashboard
<div className="bg-bg-secondary rounded-lg p-6 mt-6">
  <h2 className="text-xl font-semibold mb-4">Recompute Metrics</h2>
  <p className="text-text-secondary mb-4">
    Recalculate your music personality and loyalty streaks
  </p>
  <ComputeButton />
</div>
```

## Checklist

- [ ] Personality calculation working
- [ ] Genre diversity accurate
- [ ] Repeat rate calculated correctly
- [ ] Tags assigned properly
- [ ] Loyalty streaks calculated
- [ ] Current streak resets after gap
- [ ] Metrics persist in database
- [ ] Computation runs after sync

## Testing

1. Sync data
2. Click "Recompute Metrics"
3. Check Prisma Studio for music_personality row
4. Verify personality tags make sense
5. Check streak calculations
6. Test with various listening patterns
7. Verify metrics update on profile

## Validation

Test personality tags:
- High genre diversity (>0.7) → Explorer tag
- Low genre diversity (<0.3) → Loyalist tag
- High repeat rate (>0.6) → Repeat Listener tag
- High avg popularity (>70) → Mainstream tag

Test streaks:
- Consecutive days same artist → Increases streak
- Gap in listening → Resets current streak
- Different artist → Breaks streak

## Next Phase

Continue to [Phase 8: Polish & Deploy](phase-8-polish.md)

**Last Updated:** January 22, 2026
