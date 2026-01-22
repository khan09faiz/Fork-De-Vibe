# Feature: Top Content Display

## User Story

As a user, I want to see my top artists and tracks with time range filters.

## Components

### 1. Top Artists Grid

**Data Source:** `user_top_artists` table

**Display:**
- Grid layout (5 cols desktop, 2 cols mobile)
- Artist image (160×160px)
- Artist name
- Genres (max 2)
- Rank (1-20)

**Time Ranges:**
- Short Term (4 weeks)
- Medium Term (6 months)
- Long Term (all time)

### 2. Top Tracks List

**Data Source:** `user_top_tracks` table

**Display:**
- List layout
- Rank number
- Album art (48×48px)
- Track name
- Artist name
- Album name
- Play button (30s preview if available)

**Time Ranges:** Same as artists

## Implementation

### Fetch Logic

```typescript
const topArtists = await db.userTopArtist.findMany({
  where: { userId, timeRange },
  orderBy: { rank: 'asc' },
  take: 20
});
```

### Caching Strategy

- Cache in database for 7 days
- Check `createdAt` timestamp
- Fetch from Spotify if stale

### Tab Switching

Client-side state management for instant tab switching:

```typescript
const [timeRange, setTimeRange] = useState('short_term');
```

## API Endpoint

```typescript
// app/api/spotify/top-artists/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const timeRange = searchParams.get('time_range') || 'short_term';
  
  // Check cache
  const cached = await getFromCache(userId, timeRange);
  if (isFresh(cached)) return cached;
  
  // Fetch from Spotify
  const fresh = await fetchFromSpotify(accessToken, timeRange);
  await saveToCache(fresh);
  
  return fresh;
}
```

## Acceptance Criteria

- Show top 20 artists/tracks
- Time range tabs work
- Images load correctly
- Responsive grid/list
- Play button previews work (if available)
- Cache data for 7 days
- Handle empty states

## Edge Cases

See [Edge Cases: Spotify API](../edge-cases/spotify-api.md)

**Last Updated:** January 22, 2026
