# Edge Cases Documentation

**Purpose:** Index for all edge case handling documentation

---

## Categories

### [Spotify API Edge Cases](spotify-api.md)
Handling Spotify Web API limitations and failures:
- Incomplete listening history
- Brand new users with no data
- Token expiry and refresh
- Rate limiting
- Malformed API responses

**Read this before:** Implementing any Spotify API integration

---

### [Database Edge Cases](database.md)
Managing database constraints and integrity:
- Duplicate daily entries
- Username collisions
- Orphaned records on user deletion
- Connection pooling issues
- Migration failures
- Constraint violations

**Read this before:** Writing database queries or migrations

---

### [Calculation Logic Edge Cases](calculations.md)
Ensuring deterministic mathematical results:
- Artist loyalty streak calculation
- Music personality classification
- Genre diversity (Shannon entropy)
- Repeat rate calculation
- Total minutes aggregation
- Date range handling

**Read this before:** Implementing personality or streak algorithms

---

### [Security Edge Cases](security.md)
Preventing vulnerabilities and attacks:
- XSS in profile README
- Token leakage to client
- Unauthorized profile access
- CSRF protection
- SQL injection prevention
- Rate limiting
- Input validation

**Read this before:** Building user-facing features or API routes

---

### [UI/UX Edge Cases](ui-ux.md)
Creating graceful user experiences:
- Loading states
- Empty states
- Error boundaries
- Responsive design
- Accessibility
- Form validation feedback
- Toast notifications

**Read this before:** Building any UI component

---

### [Timezone Edge Cases](timezone.md)
Handling time zones correctly:
- UTC vs local time conversion
- Date string formats
- Day boundaries
- Daylight saving time
- Timezone storage
- Cross-timezone comparisons
- Display formatting

**Read this before:** Working with dates or timestamps

---

### [Quiz System Edge Cases](quiz.md) **NEW**
Handling quiz and leaderboard edge cases:
- AI generation failures
- Question accuracy validation
- Session interruption recovery
- Timer expiration handling
- Duplicate answer prevention
- Tie breaking in leaderboards
- Monthly reset timing
- Cheating detection
- Badge duplicate prevention

**Read this before:** Implementing quiz or leaderboard features

---

### [Concert Discovery Edge Cases](concerts.md) **NEW**
Handling concert scraping and search edge cases:
- Scraping source unavailability
- Rate limiting from sources
- Inconsistent data formats
- Duplicate concert detection
- Incorrect/outdated data
- Ambiguous location names
- Cancelled/postponed events
- Timezone display issues
- Reminder delivery failures

**Read this before:** Implementing concert discovery features

---

## Quick Reference

### Critical Rules

1. **Never trust user input** - Always validate and sanitize
2. **Never assume fields exist** - Use optional chaining (?.)
3. **Always use upsert** - For daily data to prevent duplicates
4. **Always cache Spotify data** - To respect rate limits
5. **Always sanitize HTML** - Use DOMPurify for user content
6. **Always handle empty states** - Show helpful messages
7. **Always store dates as strings** - YYYY-MM-DD in user's timezone
8. **Always implement loading states** - Never show blank screens
9. **Always validate AI output** - Never trust generated content blindly
10. **Always implement fallbacks** - For scraping and external APIs

---

## Testing Checklist

Before deploying any feature:

- [ ] All API responses validated
- [ ] Empty states implemented
- [ ] Loading states implemented
- [ ] Error boundaries added
- [ ] Token refresh logic tested
- [ ] Rate limits respected
- [ ] XSS prevention verified
- [ ] Timezone handling correct
- [ ] Database constraints enforced
- [ ] Calculation logic commented
- [ ] All edge cases tested

---

## Common Patterns

### API Error Handling

```typescript
try {
  const response = await fetch('/api/endpoint');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API error:', error);
  // Show user-friendly error message
  return { error: 'Failed to fetch data' };
}
```

### Safe Data Access

```typescript
// Use optional chaining and nullish coalescing
const imageUrl = artist.images?.[0]?.url ?? '/default-avatar.png';
const genres = artist.genres || [];
const popularity = artist.popularity ?? 0;
```

### Empty State Handling

```typescript
if (!data || data.length === 0) {
  return <EmptyState title="No data" description="..." />;
}
```

---

## When to Use Each Document

| Scenario | Document |
|----------|----------|
| Fetching from Spotify API | Spotify API |
| Saving user data | Database |
| Computing metrics | Calculations |
| Building forms | Security |
| Creating components | UI/UX |
| Working with dates | Timezone |

---

**Last Updated:** January 22, 2026
