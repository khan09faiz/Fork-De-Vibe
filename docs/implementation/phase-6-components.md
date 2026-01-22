# Phase 6: UI Components

**Duration:** 5 hours  
**Prerequisites:** Phase 5 complete

## Goals

- Build ListeningGraph component
- Create TopArtistsGrid and TopTracksGrid
- Implement MusicPersonality display
- Add ArtistLoyaltyMeter
- Build ReadmeEditor

## Step 1: ListeningGraph Component

Create `components/ListeningGraph.tsx`:

```typescript
'use client';

import { useMemo } from 'react';

interface DailyData {
  date: string;
  minutes: number;
}

export function ListeningGraph({ data }: { data: DailyData[] }) {
  const heatmap = useMemo(() => {
    const days = [];
    const dataMap = new Map(data.map(d => [d.date, d.minutes]));
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const minutes = dataMap.get(dateStr) || 0;
      
      days.push({
        date: dateStr,
        minutes,
        level: getLevel(minutes)
      });
    }
    
    return days;
  }, [data]);

  function getLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
    if (minutes === 0) return 0;
    if (minutes < 30) return 1;
    if (minutes < 60) return 2;
    if (minutes < 120) return 3;
    return 4;
  }

  function getLevelColor(level: number): string {
    const colors = ['bg-bg-tertiary', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary'];
    return colors[level];
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-flow-col grid-rows-7 gap-1 min-w-full">
        {heatmap.map((day, index) => (
          <div
            key={day.date}
            className={`w-3 h-3 rounded-sm ${getLevelColor(day.level)}`}
            title={`${day.date}: ${day.minutes} minutes`}
          />
        ))}
      </div>
    </div>
  );
}
```

## Step 2: TopArtistsGrid Component

Create `components/TopArtistsGrid.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Artist {
  id: string;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export function TopArtistsGrid({ artists, timeRange: initial }: { artists: Artist[]; timeRange: TimeRange }) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initial);

  const timeRangeLabels = {
    short_term: '4 Weeks',
    medium_term: '6 Months',
    long_term: 'All Time'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Top Artists</h2>
        <div className="flex gap-2">
          {Object.entries(timeRangeLabels).map(([range, label]) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as TimeRange)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {artists.slice(0, 20).map(artist => (
          <div key={artist.id} className="group cursor-pointer">
            <div className="relative aspect-square mb-2 overflow-hidden rounded-lg">
              {artist.imageUrl ? (
                <Image
                  src={artist.imageUrl}
                  alt={artist.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full bg-bg-tertiary flex items-center justify-center">
                  <span className="text-4xl">🎵</span>
                </div>
              )}
            </div>
            <p className="font-medium truncate">{artist.name}</p>
            {artist.genres.length > 0 && (
              <p className="text-xs text-text-secondary truncate">
                {artist.genres.slice(0, 2).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Step 3: TopTracksGrid Component

Create `components/TopTracksGrid.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Track {
  id: string;
  spotifyId: string;
  name: string;
  artistName: string;
  albumName: string;
  imageUrl: string | null;
  previewUrl: string | null;
  rank: number;
}

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export function TopTracksGrid({ tracks, timeRange: initial }: { tracks: Track[]; timeRange: TimeRange }) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initial);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const timeRangeLabels = {
    short_term: '4 Weeks',
    medium_term: '6 Months',
    long_term: 'All Time'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Top Tracks</h2>
        <div className="flex gap-2">
          {Object.entries(timeRangeLabels).map(([range, label]) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as TimeRange)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {tracks.slice(0, 20).map((track, index) => (
          <div
            key={track.id}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <span className="text-text-secondary w-6 text-center">{index + 1}</span>
            
            <div className="relative w-12 h-12 flex-shrink-0">
              {track.imageUrl ? (
                <Image
                  src={track.imageUrl}
                  alt={track.albumName}
                  fill
                  className="object-cover rounded"
                />
              ) : (
                <div className="w-full h-full bg-bg-tertiary rounded" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{track.name}</p>
              <p className="text-sm text-text-secondary truncate">
                {track.artistName} • {track.albumName}
              </p>
            </div>

            {track.previewUrl && (
              <button
                onClick={() => setPlayingId(playingId === track.id ? null : track.id)}
                className="text-primary hover:text-primary-hover transition-colors"
              >
                {playingId === track.id ? 'Pause' : 'Play'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Step 4: MusicPersonality Component

Create `components/MusicPersonality.tsx`:

```typescript
interface PersonalityData {
  tags: string[];
  genreDiversity: number;
  repeatRate: number;
  uniqueArtists: number;
}

export function MusicPersonality({ personality }: { personality: PersonalityData }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Music Personality</h2>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {personality.tags.map(tag => (
          <span
            key={tag}
            className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Genre Diversity</span>
            <span className="text-text-primary font-medium">
              {Math.round(personality.genreDiversity * 100)}%
            </span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${personality.genreDiversity * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Repeat Listener</span>
            <span className="text-text-primary font-medium">
              {Math.round(personality.repeatRate * 100)}%
            </span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${personality.repeatRate * 100}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-bg-tertiary">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Unique Artists</span>
            <span className="text-2xl font-bold text-text-primary">
              {personality.uniqueArtists}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Step 5: ArtistLoyaltyMeter Component

Create `components/ArtistLoyaltyMeter.tsx`:

```typescript
interface LoyaltyData {
  longestStreak: number;
  currentStreak: number;
  streakArtist: string | null;
}

export function ArtistLoyaltyMeter({ loyalty }: { loyalty: LoyaltyData }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Artist Loyalty</h2>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-text-secondary mb-2">Longest Streak</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔥</span>
            <div>
              <p className="text-3xl font-bold text-text-primary">
                {loyalty.longestStreak}
              </p>
              <p className="text-sm text-text-secondary">
                days {loyalty.streakArtist ? `with ${loyalty.streakArtist}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-bg-tertiary pt-6">
          <p className="text-sm text-text-secondary mb-2">Current Streak</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚡</span>
            <div>
              <p className="text-3xl font-bold text-text-primary">
                {loyalty.currentStreak}
              </p>
              <p className="text-sm text-text-secondary">days</p>
            </div>
          </div>
        </div>

        {loyalty.currentStreak === 0 && (
          <p className="text-xs text-text-muted italic">
            Listen to the same artist multiple days in a row to start a streak
          </p>
        )}
      </div>
    </div>
  );
}
```

## Step 6: ReadmeEditor Component

Create `components/ReadmeEditor.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export function ReadmeEditor({ initialContent, userId }: { initialContent: string; userId: string }) {
  const [content, setContent] = useState(initialContent);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave() {
    if (content.length > 5000) {
      setMessage('README too long (max 5000 characters)');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/user/readme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        setMessage('Saved successfully');
      } else {
        setMessage('Failed to save');
      }
    } catch (error) {
      setMessage('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  const sanitizedHtml = DOMPurify.sanitize(marked(content) as string, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title']
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('edit')}
            className={`px-4 py-2 rounded ${tab === 'edit' ? 'bg-primary' : 'bg-bg-tertiary'}`}
          >
            Edit
          </button>
          <button
            onClick={() => setTab('preview')}
            className={`px-4 py-2 rounded ${tab === 'preview' ? 'bg-primary' : 'bg-bg-tertiary'}`}
          >
            Preview
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-primary hover:bg-primary-hover rounded disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {tab === 'edit' ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={5000}
          className="w-full min-h-[300px] p-4 bg-bg-tertiary text-text-primary rounded resize-y font-mono text-sm"
          placeholder="# Write something about yourself..."
        />
      ) : (
        <div
          className="prose prose-invert max-w-none min-h-[300px] p-4 bg-bg-tertiary rounded"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      )}

      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-text-secondary">
          Markdown supported • {content.length}/5000 characters
        </p>
        {message && (
          <p className="text-xs text-text-secondary">{message}</p>
        )}
      </div>
    </div>
  );
}
```

## Step 7: README API Endpoint

Create `app/api/user/readme/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { content } = await req.json();

  if (content.length > 5000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { profileReadme: content }
  });

  revalidatePath(`/[username]`, 'page');

  return NextResponse.json({ success: true });
}
```

## Step 8: Update Profile Page

Update `app/[username]/page.tsx` to use the new components:

```typescript
import { ListeningGraph } from '@/components/ListeningGraph';
import { TopArtistsGrid } from '@/components/TopArtistsGrid';
import { TopTracksGrid } from '@/components/TopTracksGrid';
import { MusicPersonality } from '@/components/MusicPersonality';
import { ArtistLoyaltyMeter } from '@/components/ArtistLoyaltyMeter';
```

## Checklist

- [ ] ListeningGraph component functional
- [ ] TopArtistsGrid displays artists
- [ ] TopTracksGrid displays tracks
- [ ] Time range tabs work
- [ ] MusicPersonality shows metrics
- [ ] ArtistLoyaltyMeter shows streaks
- [ ] ReadmeEditor saves content
- [ ] All components responsive

## Testing

1. Visit profile page
2. Verify graph displays 365 days
3. Click time range tabs
4. Check artist/track images load
5. Test README editor save
6. Verify preview mode works
7. Test on mobile viewport

## Next Phase

Continue to [Phase 7: Calculations](phase-7-calculations.md)

**Last Updated:** January 22, 2026
