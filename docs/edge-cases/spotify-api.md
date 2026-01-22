# Spotify API Edge Cases

**Purpose:** Comprehensive handling of Spotify Web API limitations and failure modes

---

## 1. Incomplete Listening History

**Problem:**
- Spotify recently-played endpoint returns maximum 50 tracks
- No guarantee of complete listening history
- Users may have gaps from private sessions or offline listening

**Impact:**
- Listening graph has missing days
- Cannot calculate accurate total minutes
- Personality metrics may be skewed

**Mitigation:**

```typescript
async function fetchListeningHistory(accessToken: string) {
  const response = await fetchRecentlyPlayed(accessToken);
  
  if (!response || !response.length) {
    return {
      success: false,
      error: 'NO_DATA',
      message: 'No listening history available'
    };
  }
  
  return { success: true, data: response };
}
```

**UI Implementation:**

```typescript
{listeningData.length === 0 && (
  <EmptyState
    icon={<MusicIcon />}
    title="No listening data yet"
    description="Spotify limits history to the last 50 tracks. Listen to more music to see your stats!"
  />
)}
```

**User Message:**
```
Spotify limits history. Some days may be missing or incomplete.
```

---

## 2. Brand New Users

**Problem:**
- New Spotify accounts have no top artists or tracks
- Endpoints return empty arrays
- Requires listening history over time

**Impact:**
- Empty profile pages
- Broken UI if not handled

**Mitigation:**

```typescript
export async function GET(req: Request) {
  const artists = await fetchTopArtists(accessToken);
  
  return NextResponse.json({
    artists: artists || [],
    isEmpty: artists.length === 0
  });
}

function TopArtistsGrid({ artists }: Props) {
  if (!artists.length) {
    return (
      <Card>
        <EmptyState
          icon="🎵"
          title="No top artists yet"
          description="Listen to music on Spotify to see your favorites here."
          action={{
            label: "Open Spotify",
            href: "https://open.spotify.com"
          }}
        />
      </Card>
    );
  }
  
  return <Grid>{/* Render artists */}</Grid>;
}
```

**Rules:**
- Never throw errors for empty data
- Always show graceful empty states
- Never block profile creation

---

## 3. Token Expiry & Refresh

**Problem:**
- Access tokens expire after approximately 1 hour
- 401 Unauthorized if not refreshed
- Refresh token may become invalid

**Impact:**
- User sees errors on every page
- Data sync fails silently
- Session becomes unusable

**Mitigation:**

```typescript
async function refreshAccessToken(token: JWT) {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string
      })
    });

    if (!response.ok) {
      throw new Error('RefreshTokenError');
    }

    const refreshedTokens = await response.json();

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken
    };
  } catch (error) {
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    };
  }
}
```

**UI Error Handling:**

```typescript
{session.error === 'RefreshAccessTokenError' && (
  <Alert variant="error">
    Your session has expired. Please{' '}
    <button onClick={() => signIn('spotify')}>sign in again</button>.
  </Alert>
)}
```

**Critical Rules:**
- Never call Spotify API without checking token expiry
- Always implement refresh logic in NextAuth
- Always handle 401 errors gracefully

---

## 4. Rate Limiting

**Problem:**
- Spotify rate limit approximately 10 requests/second per user
- Burst requests trigger 429 Too Many Requests
- No public documentation on exact limits

**Impact:**
- Sync fails during high traffic
- Profile loading breaks
- Data becomes stale

**Mitigation:**

```typescript
const CACHE_TTL = {
  TOP_ARTISTS: 7 * 24 * 60 * 60 * 1000,
  TOP_TRACKS: 7 * 24 * 60 * 60 * 1000,
  LISTENING_HISTORY: 24 * 60 * 60 * 1000
};

async function getTopArtists(userId: string, timeRange: TimeRange) {
  const cached = await db.userTopArtist.findFirst({
    where: { userId, timeRange },
    orderBy: { createdAt: 'desc' }
  });

  if (cached && Date.now() - cached.createdAt.getTime() < CACHE_TTL.TOP_ARTISTS) {
    return cached;
  }

  return await fetchFromSpotify(userId, timeRange);
}
```

**Sync Rate Limiting:**

```typescript
const lastSync = await db.dailyListening.findFirst({
  where: { userId },
  orderBy: { createdAt: 'desc' }
});

const hoursSinceLastSync = (Date.now() - lastSync.createdAt.getTime()) / (1000 * 60 * 60);

if (hoursSinceLastSync < 1) {
  return NextResponse.json(
    { error: 'Rate limit: You can sync once per hour' },
    { status: 429 }
  );
}
```

**Recommended Refresh Schedule:**
- Top Artists/Tracks: Weekly (cron)
- Listening History: Daily (cron)
- Manual Sync: Max 1x per hour

---

## 5. Malformed API Responses

**Problem:**
- Missing fields (images array empty)
- Null values unexpectedly
- Different response structure

**Impact:**
- App crashes with undefined errors
- Data corruption in database

**Mitigation:**

```typescript
function transformArtist(spotifyArtist: any) {
  return {
    spotifyId: spotifyArtist.id || 'unknown',
    name: spotifyArtist.name || 'Unknown Artist',
    genres: spotifyArtist.genres || [],
    imageUrl: spotifyArtist.images?.[0]?.url || null,
    popularity: spotifyArtist.popularity ?? 0
  };
}

if (!response || !Array.isArray(response.items)) {
  throw new Error('Invalid Spotify API response');
}
```

**Critical Rules:**
- Never assume fields exist
- Always use optional chaining (?.) and nullish coalescing (??)
- Always provide fallback values

---

## Testing Checklist

- [ ] Empty response handling tested
- [ ] Token refresh logic verified
- [ ] Rate limit enforcement works
- [ ] Malformed response handling tested
- [ ] Error messages are user-friendly

**Last Updated:** January 22, 2026
