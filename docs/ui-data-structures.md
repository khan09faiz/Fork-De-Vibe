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

## Quickfire Quiz System Types (v2.0)

### Quiz Questions

```typescript
type QuestionType = 
  | 'multiple_choice'
  | 'true_false'
  | 'year_guess'
  | 'lyric_completion'
  | 'song_from_album'
  | 'collaboration'
  | 'first_hit'
  | 'award_guess';

type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface QuizQuestion {
  id: string;
  type: QuestionType;
  artistId: string;
  artistName: string;
  difficulty: QuestionDifficulty;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  source: string;
}

interface QuizQuestionDisplay extends Omit<QuizQuestion, 'correctAnswer' | 'explanation'> {
  // Client-safe version without answers
}
```

### Quickfire Session (2-Minute Format)

```typescript
type QuickfireStatus = 'countdown' | 'active' | 'paused' | 'completed' | 'abandoned';

interface QuickfireSession {
  id: string;
  userId: string;
  artistId: string;
  artistName: string;
  
  // Timer (base 120 seconds)
  totalDuration: 120;
  timeRemaining: number;
  bonusTimeAdded: number;
  timePenalties: number;
  
  // Question stats
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  currentStreak: number;
  longestStreak: number;
  
  // Points breakdown
  basePoints: number;
  streakBonus: number;
  listeningBonus: number;
  multiplierBonus: number;
  penaltyPoints: number;
  finalScore: number;
  
  // Listening multiplier
  artistListeningHours: number;
  listeningMultiplier: number;
  
  // Active powerups
  activePowerups: ActivePowerup[];
  powerupsUsed: PowerupUsage[];
  
  status: QuickfireStatus;
  startedAt: Date;
  completedAt?: Date;
}

interface QuizAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  difficulty: QuestionDifficulty;
  basePoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  netPoints: number;
  timeTaken: number;
  streakAtAnswer: number;
  multiplierActive: number;
  answeredAt: Date;
}
```

### Points & Penalty System

```typescript
interface PointsCalculation {
  basePoints: Record<QuestionDifficulty, number>;  // easy: 5, medium: 8, hard: 12, expert: 18
  penaltyPoints: Record<QuestionDifficulty, number>;  // easy: 3, medium: 4, hard: 5, expert: 6
  timePenalty: 2;  // Lose 2 seconds per wrong answer
}

interface ListeningMultiplier {
  under_1_hour: 1.0;
  '1_to_5_hours': 1.05;
  '5_to_20_hours': 1.10;
  '20_to_50_hours': 1.15;
  '50_to_100_hours': 1.20;
  over_100_hours: 1.25;
}

interface StreakBonus {
  '3_streak': 2;
  '5_streak': 5;
  '10_streak': 10;
  '15_streak': 15;
  '20_plus': 20;
}

interface PointsResult {
  basePoints: number;
  listeningBonus: number;
  streakBonus: number;
  multiplierBonus: number;
  penaltyPoints: number;
  netPoints: number;
}
```

### Powerup System

```typescript
type PowerupEffectType = 
  | 'freeze_time'
  | 'add_time'
  | 'multiplier'
  | 'block_penalty'
  | 'remove_options'
  | 'skip_question';

interface Powerup {
  id: string;
  slug: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  effectType: PowerupEffectType;
  effectValue: Record<string, any>;
  maxPerSession: number;
  cooldownSeconds: number | null;
}

interface UserPowerupInventory {
  powerupId: string;
  powerup: Powerup;
  quantity: number;
}

interface PowerupUsage {
  powerupId: string;
  usedAtTimeLeft: number;
  usedOnQuestionId?: string;
  usedAt: Date;
}

interface ActivePowerup {
  powerupId: string;
  slug: string;
  effectType: PowerupEffectType;
  expiresAt?: Date;
  consumed: boolean;
}

// Powerup definitions
const POWERUPS: Record<string, Omit<Powerup, 'id'>> = {
  freeze_3s: { slug: 'freeze_3s', name: 'Mini Freeze', cost: 150, icon: '🧊', effectType: 'freeze_time', effectValue: { duration: 3 }, maxPerSession: 3, cooldownSeconds: 20, description: 'Freeze timer for 3 seconds' },
  freeze_5s: { slug: 'freeze_5s', name: 'Deep Freeze', cost: 300, icon: '❄️', effectType: 'freeze_time', effectValue: { duration: 5 }, maxPerSession: 2, cooldownSeconds: 30, description: 'Freeze timer for 5 seconds' },
  extra_15s: { slug: 'extra_15s', name: 'Time Boost', cost: 250, icon: '⏱️', effectType: 'add_time', effectValue: { seconds: 15 }, maxPerSession: 2, cooldownSeconds: 45, description: 'Add 15 seconds to timer' },
  extra_30s: { slug: 'extra_30s', name: 'Major Time Boost', cost: 450, icon: '⏰', effectType: 'add_time', effectValue: { seconds: 30 }, maxPerSession: 1, cooldownSeconds: 60, description: 'Add 30 seconds to timer' },
  extra_60s: { slug: 'extra_60s', name: 'Ultimate Time', cost: 800, icon: '🕐', effectType: 'add_time', effectValue: { seconds: 60 }, maxPerSession: 1, cooldownSeconds: null, description: 'Add 60 seconds to timer (MAX)' },
  multiplier_1_2x: { slug: 'multiplier_1_2x', name: 'Point Surge', cost: 500, icon: '📈', effectType: 'multiplier', effectValue: { value: 1.2, scope: 'all_remaining' }, maxPerSession: 1, cooldownSeconds: null, description: '1.2x points for ALL remaining questions' },
  double_next: { slug: 'double_next', name: 'Double Down', cost: 200, icon: '✨', effectType: 'multiplier', effectValue: { value: 2.0, scope: 'next_question' }, maxPerSession: 3, cooldownSeconds: 15, description: '2x points for the NEXT question only' },
  shield: { slug: 'shield', name: 'Safety Shield', cost: 350, icon: '🛡️', effectType: 'block_penalty', effectValue: { count: 1 }, maxPerSession: 2, cooldownSeconds: 30, description: 'Block penalty for next wrong answer' },
  fifty_fifty: { slug: 'fifty_fifty', name: '50/50', cost: 175, icon: '🎯', effectType: 'remove_options', effectValue: { count: 2 }, maxPerSession: 3, cooldownSeconds: 20, description: 'Remove 2 wrong options' },
  skip: { slug: 'skip', name: 'Skip', cost: 125, icon: '⏭️', effectType: 'skip_question', effectValue: {}, maxPerSession: 2, cooldownSeconds: 25, description: 'Skip question without penalty (no points either)' }
};

// Bulk discount tiers
const BULK_DISCOUNTS = {
  3: 0.90,   // 10% off
  5: 0.85,   // 15% off
  10: 0.75   // 25% off
};
```

### Country & Global Leaderboards

```typescript
type LeaderboardScope = 'global' | 'country' | 'artist_global' | 'artist_country';
type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';
type LeaderboardTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend';

interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  userId: string;
  username: string;
  displayName: string;
  imageUrl: string | null;
  country: string;
  countryFlag: string;
  
  totalScore: number;
  quizzesPlayed: number;
  avgScorePerQuiz: number;
  bestSingleQuiz: number;
  totalCorrect: number;
  accuracy: number;
  
  movement: number; // +/- from previous
  tier: LeaderboardTier;
}

interface Leaderboard {
  id: string;
  scope: LeaderboardScope;
  country?: string;
  artistId?: string;
  period: LeaderboardPeriod;
  startDate: Date;
  endDate: Date;
  entries: LeaderboardEntry[];
  userPosition?: LeaderboardEntry;
  totalEntries: number;
  lastUpdatedAt: Date;
}

// Tier thresholds (by percentile)
const TIER_THRESHOLDS: Record<LeaderboardTier, { minPercentile: number; maxRank?: number }> = {
  legend: { minPercentile: 0, maxRank: 10 },
  diamond: { minPercentile: 1 },
  platinum: { minPercentile: 5 },
  gold: { minPercentile: 20 },
  silver: { minPercentile: 40 },
  bronze: { minPercentile: 100 }
};

// Monthly rewards
const TIER_REWARDS: Record<LeaderboardTier, { bonusPoints: number; badge?: string }> = {
  legend: { bonusPoints: 500, badge: 'Legend of the Month' },
  diamond: { bonusPoints: 200, badge: 'Diamond Player' },
  platinum: { bonusPoints: 100, badge: 'Platinum Player' },
  gold: { bonusPoints: 50, badge: 'Gold Player' },
  silver: { bonusPoints: 25, badge: 'Silver Player' },
  bronze: { bonusPoints: 10, badge: 'Bronze Player' }
};
```

### Badges & Achievements

```typescript
type BadgeCategory = 'performance' | 'streak' | 'economy' | 'leaderboard' | 'dedication' | 'artist_specific';
type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  awardedAt?: Date;
  progress?: number;
  metadata?: Record<string, any>;
}

interface UserQuizStats {
  userId: string;
  country?: string;
  
  // Points economy
  totalPoints: number;
  pointsSpentOnPowerups: number;
  availablePoints: number;
  
  // Performance
  quizzesCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  bestSingleScore: number;
  longestStreak: number;
  
  // Daily streaks
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastPlayedAt?: Date;
}

const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500'
};

const BADGE_DEFINITIONS: Record<string, Omit<Badge, 'id' | 'awardedAt'>> = {
  first_quiz: { name: 'First Steps', description: 'Complete your first quickfire quiz', icon: '🎯', category: 'performance', rarity: 'common' },
  speed_demon: { name: 'Speed Demon', description: 'Answer 20+ questions in a single 2-minute quiz', icon: '⚡', category: 'performance', rarity: 'rare' },
  perfectionist: { name: 'Perfectionist', description: 'Achieve 100% accuracy with 15+ questions answered', icon: '💎', category: 'performance', rarity: 'epic' },
  streak_5: { name: 'On Fire', description: 'Get a 5-question streak', icon: '🔥', category: 'streak', rarity: 'common' },
  streak_10: { name: 'Unstoppable', description: 'Get a 10-question streak', icon: '🔥🔥', category: 'streak', rarity: 'uncommon' },
  streak_20: { name: 'Legendary Streak', description: 'Get a 20-question streak', icon: '🔥🔥🔥', category: 'streak', rarity: 'epic' },
  big_spender: { name: 'Big Spender', description: 'Spend 5000 points on powerups', icon: '💰', category: 'economy', rarity: 'rare' },
  country_champion: { name: 'National Champion', description: 'Reach #1 on your country leaderboard', icon: '🏆', category: 'leaderboard', rarity: 'legendary' },
  global_legend: { name: 'Global Legend', description: 'Reach #1 on the global leaderboard', icon: '🌟', category: 'leaderboard', rarity: 'legendary' }
};
```

### Quiz UI State

```typescript
interface QuizUIState {
  // Timer display
  timeRemaining: number;
  timerColor: 'green' | 'yellow' | 'red';
  isPulsing: boolean;
  isFrozen: boolean;
  
  // Score display
  currentScore: number;
  streak: number;
  
  // Question state
  currentQuestion: QuizQuestionDisplay | null;
  selectedAnswer: string | null;
  isSubmitting: boolean;
  
  // Feedback
  feedback: {
    visible: boolean;
    isCorrect: boolean;
    pointsEarned: number;
    penaltyApplied: { time: number; points: number } | null;
    correctAnswer?: string;
  } | null;
  
  // Powerups
  availablePowerups: UserPowerupInventory[];
  activePowerups: ActivePowerup[];
  cooldowns: Record<string, number>;
}

interface QuizResultsUI {
  performance: {
    finalScore: number;
    questionsAnswered: number;
    correctAnswers: number;
    wrongAnswers: number;
    accuracy: number;
    longestStreak: number;
    breakdown: PointsResult;
  };
  leaderboard: {
    countryRank: number;
    countryRankChange: number;
    globalRank: number;
    globalRankChange: number;
    tier: LeaderboardTier;
    nextTierIn: number;
  };
  economy: {
    pointsEarned: number;
    totalPoints: number;
    availablePoints: number;
  };
  badges: Badge[];
}
```

---

## Concert System Types (v2.0)

### Concert Data

```typescript
type EventType = 'concert' | 'festival' | 'tour' | 'residency' | 'virtual';
type TicketStatus = 'on_sale' | 'presale' | 'sold_out' | 'limited_availability' | 'not_yet_announced' | 'cancelled' | 'postponed' | 'resale_only';
type VenueType = 'stadium' | 'arena' | 'theater' | 'club' | 'outdoor' | 'festival_grounds' | 'other';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  region?: string;
  country: string;
  countryCode: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  venueType: VenueType;
  imageUrl?: string;
}

interface Concert {
  id: string;
  artistId: string;
  artistName: string;
  artistImageUrl?: string;
  eventName: string;
  tourName?: string;
  eventType: EventType;
  venue: Venue;
  date: Date;
  doorsOpen?: string;
  startTime?: string;
  timezone: string;
  ticketStatus: TicketStatus;
  ticketUrl?: string;
  priceRange?: PriceRange;
  ticketSources: TicketSource[];
  supportingActs?: string[];
  ageRestriction?: string;
  description?: string;
  imageUrl?: string;
  interestedCount: number;
  attendingCount: number;
  userStatus?: UserConcertStatus;
}

interface PriceRange {
  currency: string;
  minPrice: number;
  maxPrice: number;
}

interface TicketSource {
  name: string;
  url: string;
  priceRange?: PriceRange;
  availability: 'available' | 'limited' | 'sold_out';
  isOfficial: boolean;
  fees?: number;
}
```

### User Location & Preferences

```typescript
interface UserLocation {
  id: string;
  userId: string;
  country: string;
  countryName: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  searchRadius: number;
  isDefault: boolean;
}

type UserConcertStatus = 'interested' | 'going' | 'attended' | 'skipped';

interface UserConcertInteraction {
  id: string;
  concertId: string;
  status: UserConcertStatus;
  ticketsPurchased?: number;
  reminderSet: boolean;
  reminderTime?: Date;
  notes?: string;
}
```

### Concert Search & Filters

```typescript
interface ConcertSearchParams {
  artistIds?: string[];
  fromUserTopArtists?: boolean;
  genres?: string[];
  country: string;
  region?: string;
  city?: string;
  radius?: number;
  dateFrom?: Date;
  dateTo?: Date;
  ticketStatus?: TicketStatus[];
  maxPrice?: number;
  eventTypes?: EventType[];
  sortBy: 'date' | 'relevance' | 'distance' | 'price' | 'popularity';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface ConcertSearchResult {
  concerts: Concert[];
  total: number;
  page: number;
  totalPages: number;
  suggestions?: ConcertSuggestion[];
}

interface ConcertSuggestion {
  type: 'expand_radius' | 'try_city' | 'set_alert';
  message: string;
  action: string;
}
```

### Concert Recommendations

```typescript
type RecommendationReasonType = 
  | 'top_artist'
  | 'similar_artist'
  | 'genre_match'
  | 'friends_going'
  | 'nearby'
  | 'trending'
  | 'price_drop'
  | 'last_chance'
  | 'new_announcement';

interface ConcertRecommendation {
  concert: Concert;
  score: number;
  reasons: {
    type: RecommendationReasonType;
    description: string;
    weight: number;
  }[];
}
```

### Concert UI State

```typescript
type ConcertViewMode = 'list' | 'calendar' | 'map';

interface ConcertPageState {
  concerts: Concert[];
  isLoading: boolean;
  error: string | null;
  viewMode: ConcertViewMode;
  filters: ConcertSearchParams;
  userLocation: UserLocation | null;
  selectedConcert: Concert | null;
}

interface ConcertCalendarDay {
  date: Date;
  concerts: Concert[];
  isToday: boolean;
  isSelected: boolean;
}

interface ConcertMapMarker {
  concertId: string;
  venue: Venue;
  artistName: string;
  date: Date;
  ticketStatus: TicketStatus;
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

**Last Updated:** January 24, 2026
