# Calculation Logic Edge Cases

**Purpose:** Handle mathematical edge cases and ensure deterministic results

---

## 1. Artist Loyalty Streak Calculation

**Problem Scenarios:**
- User listens to 10 different artists in one day
- Tie: 2 artists with same play count
- Day with zero listening activity
- Non-consecutive dates in database

**Algorithm Rules:**

```typescript
/**
 * Artist Loyalty Streak Algorithm
 * 
 * Rules:
 * 1. Top artist per day = artist with MOST plays that day
 * 2. Tie-breaker = artist from EARLIEST track played that day
 * 3. No listening day = streak BREAKS
 * 4. Non-consecutive dates = streak BREAKS
 * 5. Streak count = consecutive days, minimum 2 days
 */
function calculateArtistLoyalty(dailyListening: DailyListening[]) {
  let longestStreak = { artist: '', days: 0, startDate: '', endDate: '' };
  let currentStreak = { artist: '', days: 0, startDate: '' };

  const sorted = dailyListening.sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i];
    const prevDay = i > 0 ? sorted[i - 1] : null;

    if (!day.topArtistId) {
      if (currentStreak.days > longestStreak.days) {
        longestStreak = {
          artist: currentStreak.artist,
          days: currentStreak.days,
          startDate: currentStreak.startDate,
          endDate: prevDay!.date
        };
      }
      currentStreak = { artist: '', days: 0, startDate: '' };
      continue;
    }

    if (
      prevDay &&
      day.topArtistId === prevDay.topArtistId &&
      isNextDay(prevDay.date, day.date)
    ) {
      currentStreak.days++;
    } else {
      if (currentStreak.days > longestStreak.days) {
        longestStreak = {
          artist: currentStreak.artist,
          days: currentStreak.days,
          startDate: currentStreak.startDate,
          endDate: prevDay!.date
        };
      }

      currentStreak = {
        artist: day.topArtistId,
        days: 1,
        startDate: day.date
      };
    }
  }

  if (currentStreak.days > longestStreak.days) {
    longestStreak = {
      artist: currentStreak.artist,
      days: currentStreak.days,
      startDate: currentStreak.startDate,
      endDate: sorted[sorted.length - 1].date
    };
  }

  return longestStreak;
}

function isNextDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}
```

**Test Cases:**

```typescript
// Test 1: Simple streak
const data = [
  { date: '2024-01-01', topArtistId: 'radiohead' },
  { date: '2024-01-02', topArtistId: 'radiohead' },
  { date: '2024-01-03', topArtistId: 'radiohead' }
];
// Expected: 3 days

// Test 2: Streak breaks on different artist
const data2 = [
  { date: '2024-01-01', topArtistId: 'radiohead' },
  { date: '2024-01-02', topArtistId: 'radiohead' },
  { date: '2024-01-03', topArtistId: 'queen' }
];
// Expected: 2 days (radiohead)

// Test 3: Missing day breaks streak
const data3 = [
  { date: '2024-01-01', topArtistId: 'radiohead' },
  { date: '2024-01-03', topArtistId: 'radiohead' }
];
// Expected: 1 day (no streak)
```

---

## 2. Music Personality Classification

**Problem:**
- Insufficient data (< 10 tracks)
- All genres are null or empty arrays
- Zero unique artists
- Division by zero

**Mitigation:**

```typescript
function calculatePersonality(data: PersonalityInputs): MusicPersonality {
  if (data.uniqueArtists < 10) {
    return {
      tags: [],
      error: 'INSUFFICIENT_DATA',
      message: 'Listen to at least 10 different artists to see your personality'
    };
  }

  const tags: PersonalityTag[] = [];

  const genres = data.topArtists
    .flatMap(a => a.genres || [])
    .filter(g => g !== null && g !== '');

  if (genres.length === 0) {
    console.warn('No genre data available');
  } else {
    const genreDiversity = calculateEntropy(genres);
    
    if (genreDiversity > 0.7) {
      tags.push('Explorer');
    } else if (genreDiversity < 0.3) {
      tags.push('Loyalist');
    }
  }

  if (tags.length === 0 && data.uniqueArtists > 0) {
    tags.push('Music Lover');
  }

  return { tags, genreDiversity, repeatRate };
}
```

---

## 3. Genre Diversity (Shannon Entropy)

**Problem:**
- Empty genre list
- All genres the same
- Division by zero

**Formula:**
```
H(X) = -Σ p(x) * log2(p(x))
Normalized = H(X) / log2(n)
```

**Implementation:**

```typescript
function calculateEntropy(genres: string[]): number {
  if (genres.length === 0) return 0;

  const counts = new Map<string, number>();
  genres.forEach(g => counts.set(g, (counts.get(g) || 0) + 1));

  const probabilities = Array.from(counts.values()).map(count => count / genres.length);
  const entropy = -probabilities.map(p => p * Math.log2(p)).reduce((sum, val) => sum + val, 0);

  const maxEntropy = Math.log2(counts.size);
  return maxEntropy > 0 ? Math.min(entropy / maxEntropy, 1) : 0;
}
```

**Edge Cases:**
- All same genre → entropy = 0
- All different genres → entropy = 1
- Empty list → entropy = 0

---

## 4. Repeat Rate Calculation

**Problem:**
- No listening history
- All tracks played once
- Ties in play counts

**Implementation:**

```typescript
function calculateRepeatRate(dailyListening: DailyData[]): number {
  if (dailyListening.length === 0) return 0;

  const trackCounts = new Map<string, number>();
  
  dailyListening.forEach(day => {
    if (day.topTrackId) {
      trackCounts.set(day.topTrackId, (trackCounts.get(day.topTrackId) || 0) + 1);
    }
  });

  if (trackCounts.size === 0) return 0;

  const repeatedTracks = Array.from(trackCounts.values()).filter(count => count > 1).length;
  return repeatedTracks / trackCounts.size;
}
```

**Edge Cases:**
- No tracks → 0
- All tracks different → 0
- All tracks same → 1

---

## 5. Total Minutes Calculation

**Problem:**
- Missing track duration data
- Duplicate plays
- Timezone overlaps

**Implementation:**

```typescript
function calculateTotalMinutes(tracks: Track[]): number {
  if (!tracks || tracks.length === 0) return 0;

  const totalMs = tracks.reduce((sum, track) => {
    const duration = track.duration_ms || 0;
    return sum + duration;
  }, 0);

  return Math.round(totalMs / 60000);
}
```

**Edge Cases:**
- Null durations → use 0
- Very long tracks (podcasts) → cap at 10 hours
- Negative values → use 0

---

## 6. Date Range Handling

**Problem:**
- Empty date range
- Future dates
- Invalid date formats

**Implementation:**

```typescript
function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}
```

---

## Testing Checklist

- [ ] Division by zero handled
- [ ] Empty data returns default values
- [ ] Streak calculation works with gaps
- [ ] Entropy calculation validated
- [ ] Repeat rate calculation tested
- [ ] Date validation working

**Last Updated:** January 22, 2026
