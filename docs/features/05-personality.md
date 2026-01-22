# Feature: Music Personality

## User Story

As a user, I want to see my music personality traits based on my listening patterns.

## Metrics

### 1. Personality Tags

Labels assigned based on listening behavior:
- **Explorer** - High genre diversity (>0.7)
- **Loyalist** - Low genre diversity (<0.3)
- **Repeat Listener** - High repeat rate (>0.6)
- **Discoverer** - Low repeat rate (<0.3)
- **Mainstream** - High average popularity (>70)
- **Hipster** - Low average popularity (<40)

### 2. Genre Diversity

Shannon entropy calculation:

```typescript
function calculateGenreDiversity(genres: string[]): number {
  const counts = new Map<string, number>();
  genres.forEach(g => counts.set(g, (counts.get(g) || 0) + 1));
  
  const probabilities = Array.from(counts.values())
    .map(count => count / genres.length);
  
  const entropy = -probabilities
    .map(p => p * Math.log2(p))
    .reduce((sum, val) => sum + val, 0);
  
  // Normalize to 0-1
  return Math.min(entropy / Math.log2(genres.length), 1);
}
```

### 3. Repeat Rate

Percentage of tracks played multiple times:

```typescript
function calculateRepeatRate(recentTracks: Track[]): number {
  const trackCounts = new Map<string, number>();
  recentTracks.forEach(t => 
    trackCounts.set(t.id, (trackCounts.get(t.id) || 0) + 1)
  );
  
  const repeatedTracks = Array.from(trackCounts.values())
    .filter(count => count > 1).length;
  
  return repeatedTracks / trackCounts.size;
}
```

### 4. Unique Artists

Count of distinct artists in top 50 tracks.

## Data Storage

```sql
CREATE TABLE music_personality (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id),
  tags TEXT[],
  genre_diversity FLOAT,
  repeat_rate FLOAT,
  unique_artists INT,
  computed_at TIMESTAMP DEFAULT NOW()
);
```

## Calculation Trigger

Recalculate every 30 days or on manual sync:

```typescript
async function computePersonality(userId: string) {
  const topArtists = await getTopArtists(userId);
  const topTracks = await getTopTracks(userId);
  const recentTracks = await getRecentTracks(userId);
  
  const genres = topArtists.flatMap(a => a.genres);
  const genreDiversity = calculateGenreDiversity(genres);
  const repeatRate = calculateRepeatRate(recentTracks);
  const uniqueArtists = new Set(topTracks.map(t => t.artistId)).size;
  const tags = assignTags(genreDiversity, repeatRate, ...);
  
  await db.musicPersonality.upsert({
    where: { userId },
    update: { tags, genreDiversity, repeatRate, uniqueArtists, computedAt: new Date() },
    create: { userId, tags, genreDiversity, repeatRate, uniqueArtists }
  });
}
```

## Display

Card showing:
- Personality tags as colored pills
- Genre diversity progress bar
- Repeat listener progress bar
- Unique artists count

## Acceptance Criteria

- Metrics calculated correctly
- Tags assigned based on thresholds
- Progress bars animate smoothly
- Recalculates every 30 days
- Empty state if insufficient data

## Edge Cases

See [Edge Cases: Calculations](../edge-cases/calculations.md)

**Last Updated:** January 22, 2026
