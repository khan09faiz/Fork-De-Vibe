# Timezone Edge Cases

**Purpose:** Handle timezone conversions and date boundaries correctly

---

## 1. UTC vs Local Time

**Problem:**
- Spotify returns UTC timestamps
- Users are in different timezones
- Date boundaries differ (midnight UTC ≠ midnight EST)

**Impact:**
- Listening graph shows wrong dates
- Streaks calculated incorrectly
- "Today" shows yesterday's data for some users

**Example:**

```
User in EST (UTC-5):
- Listens to song at 11:30 PM EST
- Spotify records: 2024-01-01 04:30:00 UTC
- If stored as UTC → shows as Jan 1
- Should show as Dec 31 in user's timezone
```

**Mitigation:**

```typescript
function toLocalDateString(utcTimestamp: string, timezone: string): string {
  const date = new Date(utcTimestamp);
  return date.toLocaleDateString('en-CA', { timeZone: timezone });
}

// Get user's timezone
const userTimezone = user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

// When aggregating listening data
const dailyData = tracks.map(track => ({
  date: toLocalDateString(track.played_at, userTimezone),
  trackId: track.id,
  playedAt: track.played_at
}));

// Group by date in user's timezone
const grouped = groupBy(dailyData, 'date');
```

**Store Timezone:**

```prisma
model User {
  id       String @id
  username String
  timezone String @default("UTC")
}
```

---

## 2. Date String Formats

**Problem:**
- Multiple date string formats
- Parsing errors
- Inconsistent comparisons

**Standard Format:**
- Use ISO 8601: `YYYY-MM-DD`
- Always store as strings, not timestamps for daily data

**Implementation:**

```typescript
// Convert Date to YYYY-MM-DD
function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Validate date string
function isValidDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

// Parse safely
function parseDate(dateStr: string): Date | null {
  if (!isValidDateString(dateStr)) return null;
  return new Date(dateStr + 'T00:00:00Z');
}
```

---

## 3. Day Boundaries

**Problem:**
- Determining what counts as "today"
- Streak calculation across days
- Aggregation by day

**Rules:**
- Use user's local timezone for day boundaries
- A "day" starts at midnight in user's timezone
- Consecutive days = exactly 24 hours apart

**Implementation:**

```typescript
function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: timezone });
}

function isConsecutiveDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  
  return diffDays === 1;
}

// Check if track was played "today"
function isToday(playedAt: string, timezone: string): boolean {
  const trackDate = toLocalDateString(playedAt, timezone);
  const today = getTodayInTimezone(timezone);
  return trackDate === today;
}
```

---

## 4. Daylight Saving Time

**Problem:**
- DST changes affect time calculations
- Days can be 23 or 25 hours
- Timestamps shift

**Impact:**
- Streak calculations may break
- Minutes calculation slightly off
- Unexpected date shifts

**Mitigation:**

```typescript
// Always work with dates, not times for daily aggregation
// Store dates as YYYY-MM-DD strings (no time component)

// When calculating duration
function calculateMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / 60000);
}

// For daily aggregation, use date strings only
const dailyMinutes = tracks.reduce((sum, track) => {
  return sum + (track.duration_ms / 60000);
}, 0);
```

---

## 5. Timezone Storage

**Problem:**
- User moves to different timezone
- Timezone not stored
- Inconsistent date interpretation

**Solution:**

```prisma
model User {
  id       String  @id
  timezone String  @default("UTC")
  // Detect timezone on signup
}
```

```typescript
// Detect timezone client-side
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Store on user creation
await db.user.create({
  data: {
    username,
    timezone,
    spotifyId
  }
});

// Allow user to change timezone in settings
async function updateTimezone(userId: string, newTimezone: string) {
  await db.user.update({
    where: { id: userId },
    data: { timezone: newTimezone }
  });
}
```

---

## 6. Cross-Timezone Comparisons

**Problem:**
- Comparing streaks across users in different timezones
- Global leaderboards

**Solution:**
- Store all dates in user's local timezone
- Convert to UTC only for cross-user comparisons
- Display in viewer's timezone

```typescript
// Store local date
await db.dailyListening.create({
  data: {
    userId,
    date: toLocalDateString(track.played_at, user.timezone),
    minutes
  }
});

// Convert for global comparison
function normalizeToUTC(localDate: string, timezone: string): string {
  const date = new Date(localDate + 'T00:00:00');
  // Convert to UTC equivalent
  return date.toISOString().split('T')[0];
}
```

---

## 7. Future Dates

**Problem:**
- Tracks with future timestamps (clock skew)
- Invalid date ranges

**Mitigation:**

```typescript
function validatePlayedAt(playedAt: string): boolean {
  const played = new Date(playedAt);
  const now = new Date();
  
  // Reject future dates (with 5 min tolerance for clock skew)
  if (played.getTime() > now.getTime() + 5 * 60 * 1000) {
    console.warn('Future timestamp detected:', playedAt);
    return false;
  }
  
  // Reject very old dates (> 5 years)
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  
  if (played.getTime() < fiveYearsAgo.getTime()) {
    console.warn('Very old timestamp detected:', playedAt);
    return false;
  }
  
  return true;
}

// Filter invalid timestamps
const validTracks = tracks.filter(t => validatePlayedAt(t.played_at));
```

---

## 8. Display Formatting

**Problem:**
- Showing dates to users
- Relative time ("2 hours ago")
- Localization

**Implementation:**

```typescript
import { formatDistanceToNow } from 'date-fns';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatDate(dateStr: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateStr);
  
  if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

// Usage
<p>Last synced: {formatRelativeTime(user.lastSyncAt)}</p>
<p>Member since: {formatDate(user.createdAt, 'long')}</p>
```

---

## Timezone Testing Checklist

- [ ] Dates stored in user's local timezone
- [ ] Day boundaries correct for user's timezone
- [ ] Streak calculation works across timezones
- [ ] DST transitions handled
- [ ] Future dates rejected
- [ ] Timezone setting available in user profile
- [ ] Display formatting uses user's timezone

**Last Updated:** January 22, 2026
