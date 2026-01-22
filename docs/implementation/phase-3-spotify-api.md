# Phase 3: Spotify API Integration

**Duration:** 4 hours  
**Prerequisites:** Phase 2 complete, valid Spotify access token

## Goals

- Create Spotify API client
- Implement all data fetching functions
- Add error handling and retries
- Test API endpoints
- Handle rate limiting

## Step 1: Spotify Client

Create `lib/spotify/client.ts`:

```typescript
export async function fetchFromSpotify(endpoint: string, accessToken: string) {
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```

## Step 2: Recently Played Tracks

Create `lib/spotify/recently-played.ts`:

```typescript
import { fetchFromSpotify } from './client';

export async function fetchRecentlyPlayed(accessToken: string, limit = 50) {
  const data = await fetchFromSpotify(
    `/me/player/recently-played?limit=${limit}`,
    accessToken
  );

  return data.items.map((item: any) => ({
    trackId: item.track.id,
    trackName: item.track.name,
    artistId: item.track.artists[0].id,
    artistName: item.track.artists[0].name,
    albumName: item.track.album.name,
    durationMs: item.track.duration_ms,
    playedAt: item.played_at
  }));
}
```

## Step 3: Top Artists

Create `lib/spotify/top-artists.ts`:

```typescript
import { fetchFromSpotify } from './client';

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export async function fetchTopArtists(
  accessToken: string,
  timeRange: TimeRange = 'short_term',
  limit = 20
) {
  const data = await fetchFromSpotify(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );

  return data.items.map((artist: any, index: number) => ({
    spotifyId: artist.id,
    name: artist.name,
    genres: artist.genres,
    imageUrl: artist.images[0]?.url || null,
    popularity: artist.popularity,
    timeRange,
    rank: index + 1
  }));
}
```

## Step 4: Top Tracks

Create `lib/spotify/top-tracks.ts`:

```typescript
import { fetchFromSpotify } from './client';

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export async function fetchTopTracks(
  accessToken: string,
  timeRange: TimeRange = 'short_term',
  limit = 20
) {
  const data = await fetchFromSpotify(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );

  return data.items.map((track: any, index: number) => ({
    spotifyId: track.id,
    name: track.name,
    artistName: track.artists[0].name,
    albumName: track.album.name,
    imageUrl: track.album.images[0]?.url || null,
    previewUrl: track.preview_url,
    timeRange,
    rank: index + 1
  }));
}
```

## Step 5: API Routes

Create `app/api/spotify/recently-played/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { fetchRecentlyPlayed } from '@/lib/spotify/recently-played';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tracks = await fetchRecentlyPlayed(session.accessToken);
    return NextResponse.json(tracks);
  } catch (error: any) {
    console.error('Error fetching recently played:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Create `app/api/spotify/top-artists/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { fetchTopArtists } from '@/lib/spotify/top-artists';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('time_range') as any || 'short_term';

    const artists = await fetchTopArtists(session.accessToken, timeRange);
    return NextResponse.json(artists);
  } catch (error: any) {
    console.error('Error fetching top artists:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Create `app/api/spotify/top-tracks/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next/auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { fetchTopTracks } from '@/lib/spotify/top-tracks';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('time_range') as any || 'short_term';

    const tracks = await fetchTopTracks(session.accessToken, timeRange);
    return NextResponse.json(tracks);
  } catch (error: any) {
    console.error('Error fetching top tracks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Step 6: Rate Limiting Handler

Create `lib/spotify/rate-limit.ts`:

```typescript
export class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds`);
    this.retryAfter = retryAfter;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (error instanceof RateLimitError) {
        await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
      } else if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError!;
}
```

## Step 7: Update Fetch Client with Retry

Update `lib/spotify/client.ts`:

```typescript
import { RateLimitError, withRetry } from './rate-limit';

export async function fetchFromSpotify(endpoint: string, accessToken: string) {
  return withRetry(async () => {
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      throw new RateLimitError(retryAfter);
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return response.json();
  });
}
```

## Step 8: Testing Script

Create `scripts/test-spotify-api.ts`:

```typescript
import { fetchRecentlyPlayed } from '@/lib/spotify/recently-played';
import { fetchTopArtists } from '@/lib/spotify/top-artists';
import { fetchTopTracks } from '@/lib/spotify/top-tracks';

async function testSpotifyAPI() {
  const accessToken = process.env.TEST_ACCESS_TOKEN!;

  console.log('Testing Recently Played...');
  const recentTracks = await fetchRecentlyPlayed(accessToken, 5);
  console.log(`Fetched ${recentTracks.length} tracks`);
  console.log('Sample:', recentTracks[0]);

  console.log('\nTesting Top Artists...');
  const topArtists = await fetchTopArtists(accessToken, 'short_term', 5);
  console.log(`Fetched ${topArtists.length} artists`);
  console.log('Sample:', topArtists[0]);

  console.log('\nTesting Top Tracks...');
  const topTracks = await fetchTopTracks(accessToken, 'short_term', 5);
  console.log(`Fetched ${topTracks.length} tracks`);
  console.log('Sample:', topTracks[0]);

  console.log('\nAll tests passed!');
}

testSpotifyAPI().catch(console.error);
```

## Checklist

- [ ] Spotify client created
- [ ] Recently played endpoint working
- [ ] Top artists endpoint working
- [ ] Top tracks endpoint working
- [ ] Rate limiting handled
- [ ] Retry logic implemented
- [ ] API routes created
- [ ] Error handling in place

## Testing

1. Get access token from dashboard session
2. Run: `TEST_ACCESS_TOKEN=<token> npx ts-node scripts/test-spotify-api.ts`
3. Test each API route:
   - http://localhost:3000/api/spotify/recently-played
   - http://localhost:3000/api/spotify/top-artists?time_range=short_term
   - http://localhost:3000/api/spotify/top-tracks?time_range=medium_term

## Common Issues

**Issue:** 401 Unauthorized
**Solution:** Token expired, sign out and back in

**Issue:** 429 Rate Limited
**Solution:** Wait and retry, implement better caching

**Issue:** Missing scopes
**Solution:** Check Spotify app dashboard has all required scopes

## Next Phase

Continue to [Phase 4: Data Aggregation](phase-4-data-aggregation.md)

**Last Updated:** January 22, 2026
