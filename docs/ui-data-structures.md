# UI Data Structures

**Purpose:** TypeScript interfaces and types for all UI components and state

---

## Core Data Types

### User Profile

```typescript
interface User {
  id: string;
  spotifyId: string;
  username: string;
  displayName: string | null;
  email: string;
  imageUrl: string | null;
  isPublic: boolean;
  profileReadme: string | null;
  timezone: string;
  createdAt: Date;
  lastSyncAt: Date | null;
}

interface PublicProfile extends Omit<User, 'email' | 'spotifyId'> {
  stats: ProfileStats;
  personality: MusicPersonality | null;
  topArtists: Artist[];
  topTracks: Track[];
  listeningHistory: DailyListening[];
}

interface ProfileStats {
  totalListeningDays: number;
  totalMinutes: number;
  uniqueArtists: number;
  uniqueTracks: number;
  longestStreak: number;
  currentStreak: number;
}
```

---

## Music Data Types

### Artist

```typescript
interface Artist {
  id: string;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  popularity: number;
}

interface UserTopArtist extends Artist {
  rank: number;
  timeRange: TimeRange;
  userId: string;
  createdAt: Date;
}

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  description: string;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: 'short_term', label: '4 Weeks', description: 'Last month' },
  { value: 'medium_term', label: '6 Months', description: 'Past half year' },
  { value: 'long_term', label: 'All Time', description: 'Since you joined' }
];
```

### Track

```typescript
interface Track {
  id: string;
  spotifyId: string;
  name: string;
  artistName: string;
  albumName: string;
  imageUrl: string | null;
  previewUrl: string | null;
  duration_ms: number;
  popularity: number;
}

interface UserTopTrack extends Track {
  rank: number;
  timeRange: TimeRange;
  userId: string;
  createdAt: Date;
}

interface RecentlyPlayedTrack extends Track {
  playedAt: string;
}
```

---

## Listening Data

### Daily Listening

```typescript
interface DailyListening {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  topArtistId: string | null;
  topArtistName: string | null;
  topTrackId: string | null;
  topTrackName: string | null;
  trackCount: number;
  createdAt: Date;
}

interface ListeningGraphData {
  date: string;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
  topTrack: string | null;
  topArtist: string | null;
}

interface GraphTooltipData {
  date: string;
  minutes: number;
  formattedDate: string;
  topTrack: string;
  topArtist: string;
}
```

---

## Personality & Metrics

### Music Personality

```typescript
interface MusicPersonality {
  userId: string;
  tags: PersonalityTag[];
  genreDiversity: number; // 0-1
  repeatRate: number; // 0-1
  uniqueArtists: number;
  longestStreak: number;
  currentStreak: number;
  streakArtist: string | null;
  computedAt: Date;
}

type PersonalityTag =
  | 'Explorer'
  | 'Loyalist'
  | 'Repeat Listener'
  | 'Discoverer'
  | 'Mainstream'
  | 'Hipster'
  | 'Music Lover';

interface PersonalityDisplay {
  tag: PersonalityTag;
  color: string;
  icon: string;
  description: string;
}

const PERSONALITY_DESCRIPTIONS: Record<PersonalityTag, PersonalityDisplay> = {
  Explorer: {
    tag: 'Explorer',
    color: 'bg-blue-500',
    icon: '🌍',
    description: 'You love discovering diverse genres'
  },
  Loyalist: {
    tag: 'Loyalist',
    color: 'bg-purple-500',
    icon: '💎',
    description: 'You stick to your favorite genres'
  },
  'Repeat Listener': {
    tag: 'Repeat Listener',
    color: 'bg-pink-500',
    icon: '🔁',
    description: 'You replay your favorite tracks often'
  },
  Discoverer: {
    tag: 'Discoverer',
    color: 'bg-green-500',
    icon: '🔍',
    description: 'Always finding new music'
  },
  Mainstream: {
    tag: 'Mainstream',
    color: 'bg-yellow-500',
    icon: '⭐',
    description: 'You listen to popular hits'
  },
  Hipster: {
    tag: 'Hipster',
    color: 'bg-indigo-500',
    icon: '🎨',
    description: 'You prefer underground artists'
  },
  'Music Lover': {
    tag: 'Music Lover',
    color: 'bg-red-500',
    icon: '❤️',
    description: 'You just love music'
  }
};
```

### Artist Loyalty

```typescript
interface ArtistLoyalty {
  longestStreak: number;
  longestStreakArtist: string | null;
  longestStreakStart: string | null;
  longestStreakEnd: string | null;
  currentStreak: number;
  currentStreakArtist: string | null;
  currentStreakStart: string | null;
}
```

---

## Component Props

### Profile Components

```typescript
interface ProfileHeaderProps {
  user: User;
  isOwner: boolean;
  stats: ProfileStats;
}

interface ListeningGraphProps {
  data: DailyListening[];
  loading?: boolean;
}

interface TopArtistsGridProps {
  artists: UserTopArtist[];
  initialTimeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}

interface TopTracksGridProps {
  tracks: UserTopTrack[];
  initialTimeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}

interface MusicPersonalityProps {
  personality: MusicPersonality;
}

interface ArtistLoyaltyMeterProps {
  loyalty: ArtistLoyalty;
}
```

### Editor Components

```typescript
interface ReadmeEditorProps {
  initialContent: string;
  userId: string;
  onSave?: (content: string) => void;
}

interface PrivacyToggleProps {
  isPublic: boolean;
  userId: string;
  onChange?: (isPublic: boolean) => void;
}
```

### UI Components

```typescript
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
}
```

---

## API Response Types

### Sync Response

```typescript
interface SyncResponse {
  success: boolean;
  daysAggregated: number;
  artistsSaved: number;
  tracksSaved: number;
  lastSyncAt: string;
  nextSyncAvailableAt: string;
}

interface SyncError {
  error: string;
  code: 'RATE_LIMIT' | 'AUTH_ERROR' | 'API_ERROR' | 'UNKNOWN';
  retryAfter?: number;
}
```

### Spotify API Types

```typescript
interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyRecentlyPlayed {
  items: {
    track: SpotifyTrack;
    played_at: string;
  }[];
  next: string | null;
  cursors: {
    after: string;
    before: string;
  };
}

interface SpotifyTopArtistsResponse {
  items: SpotifyArtist[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

interface SpotifyTopTracksResponse {
  items: SpotifyTrack[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}
```

---

## Form & Validation Types

### Settings Form

```typescript
interface SettingsFormData {
  displayName: string;
  isPublic: boolean;
  timezone: string;
  profileReadme: string;
}

interface SettingsFormErrors {
  displayName?: string;
  timezone?: string;
  profileReadme?: string;
}
```

### Validation Schemas

```typescript
import { z } from 'zod';

const UsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores');

const ReadmeSchema = z
  .string()
  .max(5000, 'README must be at most 5000 characters')
  .optional();

const TimezoneSchema = z.string().refine(
  (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid timezone' }
);
```

---

## State Management Types

### Auth State

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
  };
  expires: string;
}
```

### App State

```typescript
interface AppState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toasts: ToastProps[];
}

interface ProfilePageState {
  profile: PublicProfile | null;
  isLoading: boolean;
  error: string | null;
  selectedTimeRange: TimeRange;
}
```

---

## Utility Types

```typescript
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type AsyncData<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
```

**Last Updated:** January 22, 2026
