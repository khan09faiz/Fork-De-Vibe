# UI Components - Part 1

**Purpose:** ProfileHeader, ListeningGraph, TopArtistsGrid, TopTracksGrid

---

## ProfileHeader

**Purpose:** Display user profile information and stats

### Structure

```typescript
interface ProfileHeaderProps {
  user: {
    username: string;
    displayName: string | null;
    imageUrl: string | null;
  };
  isOwner: boolean;
  stats: {
    totalListeningDays: number;
    totalMinutes: number;
  };
}
```

### Layout

```
┌─────────────────────────────────────────────────┐
│  [Avatar]  Username                    [Button] │
│           @displayName                          │
│                                                 │
│  🎵 365 listening days  |  ⏱️ 12,450 minutes   │
└─────────────────────────────────────────────────┘
```

### Implementation

```tsx
<div className="bg-bg-secondary rounded-lg p-6 mb-6 flex items-center gap-4">
  {user.imageUrl && (
    <img 
      src={user.imageUrl} 
      alt={user.username}
      className="w-20 h-20 rounded-full"
    />
  )}
  
  <div className="flex-1">
    <h1 className="text-3xl font-bold text-white">{user.username}</h1>
    {user.displayName && (
      <p className="text-lg text-text-secondary">@{user.displayName}</p>
    )}
    
    <div className="flex gap-6 mt-2 text-sm text-text-secondary">
      <span>{stats.totalListeningDays} listening days</span>
      <span>{stats.totalMinutes.toLocaleString()} minutes</span>
    </div>
  </div>
  
  {isOwner && (
    <Link href="/settings">
      <button className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg">
        Settings
      </button>
    </Link>
  )}
</div>
```

---

## ListeningGraph

**Purpose:** GitHub-style contribution graph for listening activity

### Structure

```typescript
interface ListeningGraphProps {
  data: {
    date: string;
    minutes: number;
  }[];
}
```

### Visual Design

```
365-day grid (52 weeks × 7 days)
Each cell: 12px × 12px with 2px gap
Color intensity based on minutes listened
```

### Implementation

```tsx
function ListeningGraph({ data }: ListeningGraphProps) {
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

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-flow-col grid-rows-7 gap-1">
        {heatmap.map((day) => (
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

### Color Mapping

```typescript
function getLevelColor(level: number): string {
  const colors = [
    'bg-bg-tertiary',     // Level 0: No activity
    'bg-primary/25',      // Level 1: 1-30 min
    'bg-primary/50',      // Level 2: 31-60 min
    'bg-primary/75',      // Level 3: 61-120 min
    'bg-primary'          // Level 4: 120+ min
  ];
  return colors[level];
}
```

---

## TopArtistsGrid

**Purpose:** Display top artists with time range selector

### Structure

```typescript
interface TopArtistsGridProps {
  artists: {
    id: string;
    name: string;
    imageUrl: string | null;
    genres: string[];
  }[];
  initialTimeRange: 'short_term' | 'medium_term' | 'long_term';
}
```

### Layout

```
[4 Weeks] [6 Months] [All Time]  ← Time range tabs

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Artist │ │ Artist │ │ Artist │ │ Artist │
│  Image │ │  Image │ │  Image │ │  Image │
├────────┤ ├────────┤ ├────────┤ ├────────┤
│  Name  │ │  Name  │ │  Name  │ │  Name  │
│ Genre  │ │ Genre  │ │ Genre  │ │ Genre  │
└────────┘ └────────┘ └────────┘ └────────┘
```

### Implementation

```tsx
function TopArtistsGrid({ artists, initialTimeRange }: TopArtistsGridProps) {
  const [timeRange, setTimeRange] = useState(initialTimeRange);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Top Artists</h2>
        <div className="flex gap-2">
          {TIME_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                timeRange === value
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
        {artists.map(artist => (
          <div key={artist.id} className="group cursor-pointer">
            <div className="relative aspect-square mb-2 overflow-hidden rounded-lg">
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full bg-bg-tertiary" />
              )}
            </div>
            <p className="font-medium truncate">{artist.name}</p>
            {artist.genres[0] && (
              <p className="text-xs text-text-secondary truncate">
                {artist.genres[0]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## TopTracksGrid

**Purpose:** Display top tracks with playback preview

### Structure

```typescript
interface TopTracksGridProps {
  tracks: {
    id: string;
    name: string;
    artistName: string;
    albumName: string;
    imageUrl: string | null;
    previewUrl: string | null;
  }[];
}
```

### Layout

```
Rank  Album   Track Name           Play
  1   [IMG]   Song Title           ▶
            Artist • Album
  2   [IMG]   Song Title           ▶
            Artist • Album
```

### Implementation

```tsx
function TopTracksGrid({ tracks }: TopTracksGridProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {tracks.map((track, index) => (
        <div
          key={track.id}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <span className="text-text-secondary w-6 text-center">
            {index + 1}
          </span>
          
          <div className="relative w-12 h-12 flex-shrink-0">
            {track.imageUrl && (
              <img
                src={track.imageUrl}
                alt={track.albumName}
                className="w-full h-full object-cover rounded"
              />
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
              onClick={() => setPlayingId(
                playingId === track.id ? null : track.id
              )}
              className="text-primary hover:text-primary-hover transition-colors"
            >
              {playingId === track.id ? 'Pause' : 'Play'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

**Last Updated:** January 22, 2026
