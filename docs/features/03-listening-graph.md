# Feature: Listening Graph

## User Story

As a user, I want to see a GitHub-style contribution graph showing my daily listening activity.

## Description

Heatmap visualization of listening minutes for the past 365 days. Each cell represents one day, color intensity based on minutes listened.

## Data Source

```sql
SELECT date, minutes, top_track_id, top_artist_id
FROM daily_listening
WHERE user_id = $1 AND date >= $2
ORDER BY date ASC
```

## Color Scale

| Minutes | Level | Color |
|---------|-------|-------|
| 0 | 0 | bg-bg-tertiary (gray) |
| 1-29 | 1 | bg-primary/25 (light green) |
| 30-59 | 2 | bg-primary/50 (medium green) |
| 60-119 | 3 | bg-primary/75 (dark green) |
| 120+ | 4 | bg-primary (full green) |

## Layout

```
Past 365 Days
[][][][][] ... (7 rows × 53 columns)
Mon Wed Fri (day labels)
```

## Implementation

```typescript
'use client';
export function ListeningGraph({ data }) {
  const heatmap = useMemo(() => 
    generateLast365Days(data), [data]
  );
  
  return (
    <div className="grid grid-cols-53 gap-1">
      {heatmap.map(day => (
        <div 
          key={day.date}
          className={getLevelColor(day.minutes)}
          title={`${day.date}: ${day.minutes}min`}
        />
      ))}
    </div>
  );
}
```

## Tooltip

Shows on hover:
- Date (YYYY-MM-DD)
- Minutes listened
- Top track (if available)
- Top artist (if available)

## Responsive

- Desktop: Full 53-week view
- Mobile: 2-week view with horizontal scroll

## Acceptance Criteria

- Shows exactly 365 days
- Correct color intensity
- Tooltip shows data on hover
- Responsive layout
- Performance optimized (useMemo)

## Edge Cases

See [Edge Cases: Calculations](../edge-cases/calculations.md)

**Last Updated:** January 22, 2026
