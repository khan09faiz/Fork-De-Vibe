# Feature: Artist Loyalty Streaks

## User Story

As a user, I want to see my loyalty to artists through listening streaks.

## Metrics

### 1. Longest Streak
Maximum consecutive days listening to the same artist.

### 2. Current Streak
Ongoing consecutive days listening to top artist.

### 3. Streak Artist
Artist associated with the longest streak.

## Calculation Algorithm

```typescript
function calculateStreaks(dailyListening: DailyListening[]) {
  let longestStreak = 0;
  let longestStreakArtist = null;
  let currentStreak = 0;
  let currentStreakArtist = null;
  let prevArtist = null;
  
  // Sort by date ascending
  const sorted = dailyListening.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  for (const day of sorted) {
    if (day.topArtistId === prevArtist) {
      currentStreak++;
    } else {
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakArtist = prevArtist;
      }
      currentStreak = 1;
      prevArtist = day.topArtistId;
    }
  }
  
  // Check final streak
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
    longestStreakArtist = prevArtist;
  }
  
  // Check if current streak is still active (last day = yesterday or today)
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const today = new Date();
  const daysSinceLastListen = Math.floor(
    (today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  
  if (daysSinceLastListen > 1) {
    currentStreak = 0;
  }
  
  return {
    longestStreak,
    longestStreakArtist,
    currentStreak
  };
}
```

## Data Storage

Stored in `music_personality` table:

```sql
ALTER TABLE music_personality
ADD COLUMN longest_streak INT DEFAULT 0,
ADD COLUMN current_streak INT DEFAULT 0,
ADD COLUMN streak_artist TEXT;
```

## Display

Card showing:
- Longest streak count + artist name
- Current streak count
- Fire emoji for longest, lightning emoji for current

## Edge Cases

### Gap Handling
- Missing days break streaks
- Only count days with listening data
- Ignore days with 0 minutes

### Timezone Considerations
- Normalize all dates to UTC
- Use date strings (YYYY-MM-DD) not timestamps

### Tie Breakers
- If multiple artists tied for top on a day, use most minutes

## Acceptance Criteria

- Streaks calculated correctly
- Current streak resets after gap
- Artist name displayed
- Empty state if no streaks
- Updates after data sync

## Edge Cases

See [Edge Cases: Calculations](../edge-cases/calculations.md)

**Last Updated:** January 22, 2026
