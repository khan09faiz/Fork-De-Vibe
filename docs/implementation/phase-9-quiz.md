# Phase 9: Quickfire Quiz & Leaderboard Implementation

**Duration:** 8-10 hours  
**Prerequisites:** Phase 1-7 completed, Last.fm API key (free), MusicBrainz access (free)

---

## Goals

- Implement 2-minute Quickfire quiz format
- Build points economy with listening-based multipliers
- Create powerup purchase and usage system
- Implement country-specific and global leaderboards
- Build penalty system for wrong answers
- Create quiz UI with real-time feedback

---

## Step 1: Database Schema Update

Add quiz-related models to `prisma/schema.prisma`:

```prisma
// FIRST: Update User model to add country field and quiz relations
model User {
  id            String   @id @default(cuid())
  spotifyId     String   @unique @map("spotify_id")
  email         String   @unique
  username      String   @unique
  displayName   String?  @map("display_name")
  imageUrl      String?  @map("image_url")
  country       String?  // ISO 3166-1 alpha-2 code (e.g., "US", "GB", "IN")
  isPublic      Boolean  @default(true) @map("is_public")
  profileReadme String?  @db.Text @map("profile_readme")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Existing relations
  listeningHistory DailyListening[]
  topArtists       UserTopArtist[]
  topTracks        UserTopTrack[]
  personality      MusicPersonality?
  followers        Follow[]          @relation("UserFollowers")
  following        Follow[]          @relation("UserFollowing")
  
  // NEW: Quiz & Concert relations
  quizSessions        QuickfireSession[]
  quizStats           UserQuizStats?
  powerupInventory    UserPowerupInventory[]
  powerupPurchases    PowerupPurchase[]
  badges              Badge[]
  leaderboardEntries  LeaderboardEntry[]
  userLocations       UserLocation[]
  concertInteractions UserConcertInteraction[]

  @@index([username])
  @@index([spotifyId])
  @@index([country])
  @@map("users")
}

// Now add quiz models...

model QuizQuestion {
  id            String   @id @default(cuid())
  artistId      String   @map("artist_id")
  artistName    String   @map("artist_name")
  type          String
  difficulty    String   // easy, medium, hard, expert
  question      String   @db.Text
  options       String[] 
  correctAnswer String   @map("correct_answer")
  explanation   String?  @db.Text
  source        String?
  usageCount    Int      @default(0) @map("usage_count")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  
  answers       QuizAnswer[]
  
  @@index([artistId, difficulty, isActive])
  @@map("quiz_questions")
}

model QuickfireSession {
  id                   String    @id @default(cuid())
  userId               String    @map("user_id")
  artistId             String    @map("artist_id")
  artistName           String    @map("artist_name")
  
  // Time tracking (base 120 seconds)
  totalDuration        Int       @default(120) @map("total_duration")
  bonusTimeAdded       Int       @default(0) @map("bonus_time_added")
  timePenalties        Int       @default(0) @map("time_penalties")
  
  // Question stats
  questionsAnswered    Int       @default(0) @map("questions_answered")
  correctAnswers       Int       @default(0) @map("correct_answers")
  wrongAnswers         Int       @default(0) @map("wrong_answers")
  longestStreak        Int       @default(0) @map("longest_streak")
  
  // Points breakdown
  basePoints           Int       @default(0) @map("base_points")
  streakBonus          Int       @default(0) @map("streak_bonus")
  listeningBonus       Int       @default(0) @map("listening_bonus")
  multiplierBonus      Int       @default(0) @map("multiplier_bonus")
  penaltyPoints        Int       @default(0) @map("penalty_points")
  finalScore           Int       @default(0) @map("final_score")
  
  // Listening multiplier snapshot
  artistListeningHours Float     @default(0) @map("artist_listening_hours")
  listeningMultiplier  Float     @default(1.0) @map("listening_multiplier")
  
  status               String    @default("active") // active, completed, abandoned
  startedAt            DateTime  @default(now()) @map("started_at")
  completedAt          DateTime? @map("completed_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  answers              QuizAnswer[]
  powerupUsages        PowerupUsage[]
  
  @@index([userId, status])
  @@index([artistId, finalScore])
  @@map("quickfire_sessions")
}

model QuizAnswer {
  id               String   @id @default(cuid())
  sessionId        String   @map("session_id")
  questionId       String   @map("question_id")
  selectedAnswer   String   @map("selected_answer")
  isCorrect        Boolean  @map("is_correct")
  difficulty       String
  basePoints       Int      @map("base_points")
  bonusPoints      Int      @default(0) @map("bonus_points")
  penaltyPoints    Int      @default(0) @map("penalty_points")
  netPoints        Int      @map("net_points")
  timeTaken        Float    @map("time_taken")
  streakAtAnswer   Int      @default(0) @map("streak_at_answer")
  multiplierActive Float    @default(1.0) @map("multiplier_active")
  answeredAt       DateTime @default(now()) @map("answered_at")
  
  session          QuickfireSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  question         QuizQuestion     @relation(fields: [questionId], references: [id])
  
  @@index([sessionId])
  @@map("quiz_answers")
}

model UserQuizStats {
  id                    String    @id @default(cuid())
  userId                String    @unique @map("user_id")
  country               String?   // ISO country code
  
  // Points economy
  totalPoints           Int       @default(0) @map("total_points")
  pointsSpentOnPowerups Int       @default(0) @map("points_spent_powerups")
  availablePoints       Int       @default(0) @map("available_points")
  
  // Performance stats
  quizzesCompleted      Int       @default(0) @map("quizzes_completed")
  totalQuestionsAnswered Int      @default(0) @map("total_questions_answered")
  totalCorrect          Int       @default(0) @map("total_correct")
  totalWrong            Int       @default(0) @map("total_wrong")
  bestSingleScore       Int       @default(0) @map("best_single_score")
  longestStreak         Int       @default(0) @map("longest_streak")
  
  // Daily streaks
  currentDailyStreak    Int       @default(0) @map("current_daily_streak")
  longestDailyStreak    Int       @default(0) @map("longest_daily_streak")
  lastPlayedAt          DateTime? @map("last_played_at")
  
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_quiz_stats")
}

// Powerup System
model Powerup {
  id              String   @id @default(cuid())
  slug            String   @unique
  name            String
  description     String
  cost            Int
  icon            String
  effectType      String   @map("effect_type")
  effectValue     Json     @map("effect_value")
  maxPerSession   Int      @default(3) @map("max_per_session")
  cooldownSeconds Int?     @map("cooldown_seconds")
  isActive        Boolean  @default(true) @map("is_active")
  
  inventory       UserPowerupInventory[]
  usages          PowerupUsage[]
  
  @@map("powerups")
}

model UserPowerupInventory {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  powerupId   String   @map("powerup_id")
  quantity    Int      @default(0)
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  powerup     Powerup  @relation(fields: [powerupId], references: [id])
  
  @@unique([userId, powerupId])
  @@map("user_powerup_inventory")
}

model PowerupUsage {
  id               String   @id @default(cuid())
  sessionId        String   @map("session_id")
  powerupId        String   @map("powerup_id")
  usedAtTimeLeft   Int      @map("used_at_time_left")
  usedOnQuestionId String?  @map("used_on_question_id")
  usedAt           DateTime @default(now()) @map("used_at")
  
  session          QuickfireSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  powerup          Powerup          @relation(fields: [powerupId], references: [id])
  
  @@index([sessionId])
  @@map("powerup_usages")
}

model PowerupPurchase {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  powerupId   String   @map("powerup_id")
  quantity    Int
  unitCost    Int      @map("unit_cost")
  totalCost   Int      @map("total_cost")
  discount    Float    @default(0)
  purchasedAt DateTime @default(now()) @map("purchased_at")
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("powerup_purchases")
}

// Leaderboards
model Leaderboard {
  id          String   @id @default(cuid())
  scope       String   // global, country, artist_global, artist_country
  country     String?  // ISO code for country-specific
  artistId    String?  @map("artist_id")
  period      String   // daily, weekly, monthly, all_time
  startDate   DateTime @map("start_date")
  endDate     DateTime @map("end_date")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  entries     LeaderboardEntry[]
  
  @@unique([scope, country, artistId, period, startDate])
  @@map("leaderboards")
}

model LeaderboardEntry {
  id             String   @id @default(cuid())
  leaderboardId  String   @map("leaderboard_id")
  userId         String   @map("user_id")
  rank           Int
  previousRank   Int?     @map("previous_rank")
  totalScore     Int      @map("total_score")
  quizzesPlayed  Int      @map("quizzes_played")
  bestSingleQuiz Int      @map("best_single_quiz")
  totalCorrect   Int      @map("total_correct")
  accuracy       Float
  tier           String   @default("bronze")
  firstQuizAt    DateTime @default(now()) @map("first_quiz_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  
  leaderboard    Leaderboard @relation(fields: [leaderboardId], references: [id], onDelete: Cascade)
  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([leaderboardId, userId])
  @@index([leaderboardId, rank])
  @@map("leaderboard_entries")
}

model LeaderboardHistory {
  id          String   @id @default(cuid())
  scope       String
  country     String?
  artistId    String?  @map("artist_id")
  period      String
  startDate   DateTime @map("start_date")
  endDate     DateTime @map("end_date")
  winnerId    String   @map("winner_id")
  winnerScore Int      @map("winner_score")
  topEntries  Json     @map("top_entries")
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("leaderboard_history")
}

model Badge {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  badgeType   String   @map("badge_type")
  artistId    String?  @map("artist_id")
  metadata    Json?
  awardedAt   DateTime @default(now()) @map("awarded_at")
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, badgeType, artistId])
  @@index([userId])
  @@map("badges")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_quickfire_quiz_system
```

---

## Step 2: Points Calculation Service

Create `lib/quiz/points.ts`:

```typescript
// lib/quiz/points.ts

export interface PointsInput {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  isCorrect: boolean;
  currentStreak: number;
  artistListeningHours: number;
  activeMultiplier: number;
}

export interface PointsResult {
  basePoints: number;
  listeningBonus: number;
  streakBonus: number;
  multiplierBonus: number;
  penaltyPoints: number;
  netPoints: number;
}

const BASE_POINTS: Record<string, number> = {
  easy: 5,
  medium: 8,
  hard: 12,
  expert: 18
};

const PENALTY_POINTS: Record<string, number> = {
  easy: 3,
  medium: 4,
  hard: 5,
  expert: 6
};

export const TIME_PENALTY_SECONDS = 2;

export function calculatePoints(input: PointsInput): PointsResult {
  // Wrong answer handling
  if (!input.isCorrect) {
    return {
      basePoints: 0,
      listeningBonus: 0,
      streakBonus: 0,
      multiplierBonus: 0,
      penaltyPoints: PENALTY_POINTS[input.difficulty],
      netPoints: -PENALTY_POINTS[input.difficulty]
    };
  }
  
  // Calculate listening multiplier
  const listeningMultiplier = getListeningMultiplier(input.artistListeningHours);
  
  // Calculate streak bonus
  const streakBonus = getStreakBonus(input.currentStreak);
  
  // Base calculation
  const basePoints = BASE_POINTS[input.difficulty];
  const withListening = Math.floor(basePoints * listeningMultiplier);
  const listeningBonus = withListening - basePoints;
  
  // Apply powerup multiplier
  const subtotal = withListening + streakBonus;
  const withMultiplier = Math.floor(subtotal * input.activeMultiplier);
  const multiplierBonus = withMultiplier - subtotal;
  
  return {
    basePoints,
    listeningBonus,
    streakBonus,
    multiplierBonus,
    penaltyPoints: 0,
    netPoints: withMultiplier
  };
}

export function getListeningMultiplier(hours: number): number {
  if (hours >= 100) return 1.25;
  if (hours >= 50) return 1.20;
  if (hours >= 20) return 1.15;
  if (hours >= 5) return 1.10;
  if (hours >= 1) return 1.05;
  return 1.0;
}

export function getStreakBonus(streak: number): number {
  if (streak >= 20) return 20;
  if (streak >= 15) return 15;
  if (streak >= 10) return 10;
  if (streak >= 5) return 5;
  if (streak >= 3) return 2;
  return 0;
}

export function calculateTier(totalUsers: number, rank: number): string {
  const percentile = (rank / totalUsers) * 100;
  
  if (rank <= 10) return 'legend';
  if (percentile <= 1) return 'diamond';
  if (percentile <= 5) return 'platinum';
  if (percentile <= 20) return 'gold';
  if (percentile <= 40) return 'silver';
  return 'bronze';
}
```

---

## Step 3: Powerup Service

Create `lib/quiz/powerups.ts`:

```typescript
// lib/quiz/powerups.ts

import { db } from '@/lib/db';

export interface PowerupDefinition {
  slug: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  effectType: string;
  effectValue: Record<string, any>;
  maxPerSession: number;
  cooldownSeconds: number | null;
}

export const POWERUPS: PowerupDefinition[] = [
  {
    slug: 'freeze_3s',
    name: 'Mini Freeze',
    description: 'Freeze timer for 3 seconds',
    cost: 150,
    icon: '🧊',
    effectType: 'freeze_time',
    effectValue: { duration: 3 },
    maxPerSession: 3,
    cooldownSeconds: 20
  },
  {
    slug: 'freeze_5s',
    name: 'Deep Freeze',
    description: 'Freeze timer for 5 seconds',
    cost: 300,
    icon: '❄️',
    effectType: 'freeze_time',
    effectValue: { duration: 5 },
    maxPerSession: 2,
    cooldownSeconds: 30
  },
  {
    slug: 'extra_15s',
    name: 'Time Boost',
    description: 'Add 15 seconds to timer',
    cost: 250,
    icon: '⏱️',
    effectType: 'add_time',
    effectValue: { seconds: 15 },
    maxPerSession: 2,
    cooldownSeconds: 45
  },
  {
    slug: 'extra_30s',
    name: 'Major Time Boost',
    description: 'Add 30 seconds to timer',
    cost: 450,
    icon: '⏰',
    effectType: 'add_time',
    effectValue: { seconds: 30 },
    maxPerSession: 1,
    cooldownSeconds: 60
  },
  {
    slug: 'extra_60s',
    name: 'Ultimate Time',
    description: 'Add 60 seconds to timer (MAX)',
    cost: 800,
    icon: '🕐',
    effectType: 'add_time',
    effectValue: { seconds: 60 },
    maxPerSession: 1,
    cooldownSeconds: null
  },
  {
    slug: 'multiplier_1_2x',
    name: 'Point Surge',
    description: '1.2x points for ALL remaining questions',
    cost: 500,
    icon: '📈',
    effectType: 'multiplier',
    effectValue: { value: 1.2, scope: 'all_remaining' },
    maxPerSession: 1,
    cooldownSeconds: null
  },
  {
    slug: 'double_next',
    name: 'Double Down',
    description: '2x points for the NEXT question only',
    cost: 200,
    icon: '✨',
    effectType: 'multiplier',
    effectValue: { value: 2.0, scope: 'next_question' },
    maxPerSession: 3,
    cooldownSeconds: 15
  },
  {
    slug: 'shield',
    name: 'Safety Shield',
    description: 'Block penalty for next wrong answer',
    cost: 350,
    icon: '🛡️',
    effectType: 'block_penalty',
    effectValue: { count: 1 },
    maxPerSession: 2,
    cooldownSeconds: 30
  },
  {
    slug: 'fifty_fifty',
    name: '50/50',
    description: 'Remove 2 wrong options',
    cost: 175,
    icon: '🎯',
    effectType: 'remove_options',
    effectValue: { count: 2 },
    maxPerSession: 3,
    cooldownSeconds: 20
  },
  {
    slug: 'skip',
    name: 'Skip',
    description: 'Skip question without penalty (no points either)',
    cost: 125,
    icon: '⏭️',
    effectType: 'skip_question',
    effectValue: {},
    maxPerSession: 2,
    cooldownSeconds: 25
  }
];

export const BULK_DISCOUNTS = {
  3: 0.90,   // 10% off
  5: 0.85,   // 15% off
  10: 0.75   // 25% off
};

export async function seedPowerups() {
  for (const powerup of POWERUPS) {
    await db.powerup.upsert({
      where: { slug: powerup.slug },
      update: powerup,
      create: powerup
    });
  }
}

export async function purchasePowerup(
  userId: string,
  powerupSlug: string,
  quantity: number
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const powerup = await db.powerup.findUnique({
    where: { slug: powerupSlug }
  });
  
  if (!powerup) {
    return { success: false, error: 'Powerup not found' };
  }
  
  const userStats = await db.userQuizStats.findUnique({
    where: { userId }
  });
  
  if (!userStats) {
    return { success: false, error: 'User stats not found' };
  }
  
  // Calculate cost with bulk discount
  let discount = 1.0;
  if (quantity >= 10) discount = BULK_DISCOUNTS[10];
  else if (quantity >= 5) discount = BULK_DISCOUNTS[5];
  else if (quantity >= 3) discount = BULK_DISCOUNTS[3];
  
  const totalCost = Math.floor(powerup.cost * quantity * discount);
  
  if (userStats.availablePoints < totalCost) {
    return { 
      success: false, 
      error: `Insufficient points. Need ${totalCost}, have ${userStats.availablePoints}` 
    };
  }
  
  // Execute purchase in transaction
  await db.$transaction(async (tx) => {
    // Deduct points
    await tx.userQuizStats.update({
      where: { userId },
      data: {
        availablePoints: { decrement: totalCost },
        pointsSpentOnPowerups: { increment: totalCost }
      }
    });
    
    // Add to inventory
    await tx.userPowerupInventory.upsert({
      where: {
        userId_powerupId: { userId, powerupId: powerup.id }
      },
      update: {
        quantity: { increment: quantity }
      },
      create: {
        userId,
        powerupId: powerup.id,
        quantity
      }
    });
    
    // Record purchase
    await tx.powerupPurchase.create({
      data: {
        userId,
        powerupId: powerup.id,
        quantity,
        unitCost: powerup.cost,
        totalCost,
        discount: 1 - discount
      }
    });
  });
  
  const newStats = await db.userQuizStats.findUnique({ where: { userId } });
  return { success: true, newBalance: newStats?.availablePoints || 0 };
}

export async function usePowerup(
  sessionId: string,
  powerupSlug: string,
  timeRemaining: number,
  questionId?: string
): Promise<{ success: boolean; error?: string; effect?: any }> {
  const session = await db.quickfireSession.findUnique({
    where: { id: sessionId },
    include: { powerupUsages: { include: { powerup: true } } }
  });
  
  if (!session || session.status !== 'active') {
    return { success: false, error: 'Invalid session' };
  }
  
  const powerup = await db.powerup.findUnique({
    where: { slug: powerupSlug }
  });
  
  if (!powerup) {
    return { success: false, error: 'Powerup not found' };
  }
  
  // Check inventory
  const inventory = await db.userPowerupInventory.findUnique({
    where: {
      userId_powerupId: { userId: session.userId, powerupId: powerup.id }
    }
  });
  
  if (!inventory || inventory.quantity <= 0) {
    return { success: false, error: 'Powerup not in inventory' };
  }
  
  // Check max per session
  const sessionUsageCount = session.powerupUsages.filter(
    u => u.powerupId === powerup.id
  ).length;
  
  if (sessionUsageCount >= powerup.maxPerSession) {
    return { success: false, error: 'Max uses reached for this session' };
  }
  
  // Check cooldown
  if (powerup.cooldownSeconds) {
    const lastUsage = session.powerupUsages
      .filter(u => u.powerupId === powerup.id)
      .sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime())[0];
    
    if (lastUsage) {
      const elapsed = (Date.now() - lastUsage.usedAt.getTime()) / 1000;
      if (elapsed < powerup.cooldownSeconds) {
        return { 
          success: false, 
          error: `Cooldown: ${Math.ceil(powerup.cooldownSeconds - elapsed)}s remaining` 
        };
      }
    }
  }
  
  // Apply powerup
  await db.$transaction(async (tx) => {
    // Decrement inventory
    await tx.userPowerupInventory.update({
      where: { id: inventory.id },
      data: { quantity: { decrement: 1 } }
    });
    
    // Record usage
    await tx.powerupUsage.create({
      data: {
        sessionId,
        powerupId: powerup.id,
        usedAtTimeLeft: timeRemaining,
        usedOnQuestionId: questionId
      }
    });
  });
  
  return { 
    success: true, 
    effect: {
      type: powerup.effectType,
      value: powerup.effectValue
    }
  };
}
```

---

## Step 3.5: Question Generation Service (FREE APIs)

Create `lib/quiz/questions.ts`:

```typescript
// lib/quiz/questions.ts
// Uses FREE APIs: MusicBrainz, Last.fm, Wikipedia

import { db } from '@/lib/db';

interface ArtistData {
  name: string;
  mbid?: string;           // MusicBrainz ID
  genres: string[];
  topTracks: string[];
  albums: { name: string; year: number }[];
  members?: string[];
  formedYear?: number;
  biography?: string;
  similarArtists: string[];
}

interface GeneratedQuestion {
  type: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  source: string;
}

// Free API: Last.fm (https://www.last.fm/api/account/create)
async function fetchLastFmData(artistName: string): Promise<Partial<ArtistData>> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error('LASTFM_API_KEY required');
  
  const baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  
  // Fetch artist info
  const infoRes = await fetch(
    `${baseUrl}?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json`
  );
  const infoData = await infoRes.json();
  const artist = infoData.artist;
  
  // Fetch top tracks
  const tracksRes = await fetch(
    `${baseUrl}?method=artist.gettoptracks&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&limit=20`
  );
  const tracksData = await tracksRes.json();
  
  // Fetch top albums
  const albumsRes = await fetch(
    `${baseUrl}?method=artist.gettopalbums&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&limit=15`
  );
  const albumsData = await albumsRes.json();
  
  // Fetch similar artists
  const similarRes = await fetch(
    `${baseUrl}?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&limit=10`
  );
  const similarData = await similarRes.json();
  
  return {
    name: artist?.name,
    mbid: artist?.mbid,
    genres: artist?.tags?.tag?.map((t: any) => t.name) || [],
    topTracks: tracksData.toptracks?.track?.map((t: any) => t.name) || [],
    albums: albumsData.topalbums?.album?.map((a: any) => ({
      name: a.name,
      year: 0 // Last.fm doesn't provide year, will enrich from MusicBrainz
    })) || [],
    biography: artist?.bio?.summary?.replace(/<[^>]*>/g, ''),
    similarArtists: similarData.similarartists?.artist?.map((a: any) => a.name) || []
  };
}

// Free API: MusicBrainz (https://musicbrainz.org/doc/MusicBrainz_API)
async function fetchMusicBrainzData(artistName: string, mbid?: string): Promise<Partial<ArtistData>> {
  const userAgent = process.env.MUSICBRAINZ_USER_AGENT || 'TuneHub/1.0 (contact@tunehub.io)';
  const baseUrl = 'https://musicbrainz.org/ws/2';
  
  // Search for artist if no MBID
  let artistId = mbid;
  if (!artistId) {
    const searchRes = await fetch(
      `${baseUrl}/artist?query=${encodeURIComponent(artistName)}&fmt=json&limit=1`,
      { headers: { 'User-Agent': userAgent } }
    );
    const searchData = await searchRes.json();
    artistId = searchData.artists?.[0]?.id;
  }
  
  if (!artistId) return {};
  
  // Rate limit: 1 request per second for MusicBrainz
  await new Promise(r => setTimeout(r, 1100));
  
  // Fetch artist with releases
  const artistRes = await fetch(
    `${baseUrl}/artist/${artistId}?inc=releases+release-groups&fmt=json`,
    { headers: { 'User-Agent': userAgent } }
  );
  const artistData = await artistRes.json();
  
  return {
    mbid: artistId,
    formedYear: artistData['life-span']?.begin ? parseInt(artistData['life-span'].begin.split('-')[0]) : undefined,
    members: artistData.relations?.filter((r: any) => r.type === 'member of band')
      .map((r: any) => r.artist?.name) || [],
    albums: artistData['release-groups']
      ?.filter((rg: any) => rg['primary-type'] === 'Album')
      .map((rg: any) => ({
        name: rg.title,
        year: rg['first-release-date'] ? parseInt(rg['first-release-date'].split('-')[0]) : 0
      })) || []
  };
}

// Free API: Wikipedia (https://en.wikipedia.org/api/rest_v1/)
async function fetchWikipediaFacts(artistName: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!res.ok) return [];
    
    const data = await res.json();
    const extract = data.extract || '';
    
    // Extract facts from the summary
    const facts: string[] = [];
    
    // Extract years mentioned
    const yearMatches = extract.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches) {
      facts.push(`years_mentioned: ${yearMatches.join(', ')}`);
    }
    
    // Extract location mentions
    const locationMatch = extract.match(/from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (locationMatch) {
      facts.push(`origin: ${locationMatch[1]}`);
    }
    
    return facts;
  } catch {
    return [];
  }
}

// Aggregate data from all free sources
async function getArtistData(artistName: string): Promise<ArtistData> {
  const [lastfm, musicbrainz, wikipedia] = await Promise.all([
    fetchLastFmData(artistName),
    fetchMusicBrainzData(artistName, undefined).catch(() => ({})),
    fetchWikipediaFacts(artistName).catch(() => [])
  ]);
  
  // Merge data, preferring MusicBrainz for album years
  const albums = (musicbrainz.albums?.length ? musicbrainz.albums : lastfm.albums) || [];
  
  return {
    name: lastfm.name || artistName,
    mbid: lastfm.mbid || musicbrainz.mbid,
    genres: lastfm.genres || [],
    topTracks: lastfm.topTracks || [],
    albums,
    members: musicbrainz.members,
    formedYear: musicbrainz.formedYear,
    biography: lastfm.biography,
    similarArtists: lastfm.similarArtists || []
  };
}

// Template-based question generation (NO LLM required)
function generateQuestionsFromData(artistData: ArtistData): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const { name, genres, topTracks, albums, members, formedYear, similarArtists } = artistData;
  
  // EASY: Multiple choice about top tracks
  if (topTracks.length >= 4) {
    questions.push({
      type: 'multiple_choice',
      difficulty: 'easy',
      question: `Which of these is a popular song by ${name}?`,
      options: shuffleArray([topTracks[0], ...getRandomFakeTracks(3)]),
      correctAnswer: topTracks[0],
      explanation: `"${topTracks[0]}" is one of ${name}'s most popular tracks.`,
      source: 'last.fm'
    });
    
    // Another easy question with different track
    if (topTracks[3]) {
      questions.push({
        type: 'multiple_choice',
        difficulty: 'easy',
        question: `"${topTracks[3]}" is a song by which artist?`,
        options: shuffleArray([name, ...getRandomFakeArtists(3)]),
        correctAnswer: name,
        explanation: `"${topTracks[3]}" is performed by ${name}.`,
        source: 'last.fm'
      });
    }
  }
  
  // EASY: Genre questions
  if (genres.length > 0) {
    questions.push({
      type: 'multiple_choice',
      difficulty: 'easy',
      question: `What genre is ${name} primarily associated with?`,
      options: shuffleArray([genres[0], ...getRandomFakeGenres(3, genres)]),
      correctAnswer: genres[0],
      explanation: `${name} is known for ${genres.slice(0, 3).join(', ')} music.`,
      source: 'last.fm'
    });
  }
  
  // MEDIUM: Album questions
  if (albums.length >= 4) {
    const realAlbum = albums[0];
    questions.push({
      type: 'multiple_choice',
      difficulty: 'medium',
      question: `Which album was released by ${name}?`,
      options: shuffleArray([realAlbum.name, ...getRandomFakeAlbums(3)]),
      correctAnswer: realAlbum.name,
      explanation: `"${realAlbum.name}" is an album by ${name}${realAlbum.year ? ` from ${realAlbum.year}` : ''}.`,
      source: 'musicbrainz'
    });
    
    // Song from album question
    if (topTracks.length > 0) {
      questions.push({
        type: 'song_from_album',
        difficulty: 'medium',
        question: `Which song is from ${name}'s catalog?`,
        options: shuffleArray([topTracks[0], ...getRandomFakeTracks(3)]),
        correctAnswer: topTracks[0],
        explanation: `"${topTracks[0]}" is one of ${name}'s tracks.`,
        source: 'last.fm'
      });
    }
  }
  
  // MEDIUM: Year questions
  if (albums.filter(a => a.year > 1900).length >= 2) {
    const albumWithYear = albums.find(a => a.year > 1900);
    if (albumWithYear) {
      questions.push({
        type: 'year_guess',
        difficulty: 'medium',
        question: `When was "${albumWithYear.name}" by ${name} released?`,
        options: shuffleArray([
          albumWithYear.year.toString(),
          (albumWithYear.year - 2).toString(),
          (albumWithYear.year + 1).toString(),
          (albumWithYear.year + 3).toString()
        ]),
        correctAnswer: albumWithYear.year.toString(),
        explanation: `"${albumWithYear.name}" was released in ${albumWithYear.year}.`,
        source: 'musicbrainz'
      });
    }
  }
  
  // HARD: Similar artists / collaboration
  if (similarArtists.length >= 3) {
    questions.push({
      type: 'collaboration',
      difficulty: 'hard',
      question: `Which artist has a similar style to ${name}?`,
      options: shuffleArray([similarArtists[0], ...getRandomFakeArtists(3)]),
      correctAnswer: similarArtists[0],
      explanation: `${similarArtists[0]} is considered similar to ${name}.`,
      source: 'last.fm'
    });
  }
  
  // HARD: Career start year
  if (formedYear && formedYear > 1900) {
    questions.push({
      type: 'year_guess',
      difficulty: 'hard',
      question: `When did ${name} start their career/form?`,
      options: shuffleArray([
        formedYear.toString(),
        (formedYear - 3).toString(),
        (formedYear + 2).toString(),
        (formedYear + 5).toString()
      ]),
      correctAnswer: formedYear.toString(),
      explanation: `${name} started/formed in ${formedYear}.`,
      source: 'musicbrainz'
    });
  }
  
  // EXPERT: True/False deep knowledge
  if (topTracks.length > 10) {
    questions.push({
      type: 'true_false',
      difficulty: 'expert',
      question: `True or False: "${topTracks[8]}" is a song by ${name}?`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: `"${topTracks[8]}" is indeed a song by ${name}.`,
      source: 'last.fm'
    });
  }
  
  // EXPERT: Obscure track identification
  if (topTracks.length > 15) {
    questions.push({
      type: 'multiple_choice',
      difficulty: 'expert',
      question: `Which of these lesser-known tracks is by ${name}?`,
      options: shuffleArray([topTracks[14], ...getRandomFakeTracks(3)]),
      correctAnswer: topTracks[14],
      explanation: `"${topTracks[14]}" is a track by ${name}.`,
      source: 'last.fm'
    });
  }
  
  return questions;
}

// Helper functions for fake options
function getRandomFakeTracks(count: number): string[] {
  const fakeTracks = [
    'Midnight Shadows', 'Electric Dreams', 'Neon Lights', 'Crystal Heart',
    'Velvet Sky', 'Silver Moon', 'Golden Hours', 'Purple Rain Falls',
    'Ocean Waves', 'Desert Wind', 'Mountain High', 'City Lights',
    'Broken Glass', 'Falling Stars', 'Rising Sun', 'Endless Night'
  ];
  return shuffleArray(fakeTracks).slice(0, count);
}

function getRandomFakeArtists(count: number): string[] {
  const fakeArtists = [
    'The Electric Hearts', 'Neon Dreams', 'Crystal Palace', 'Silver Shadows',
    'Midnight Echo', 'Velvet Underground Cover', 'Desert Storm Band',
    'Ocean Deep', 'Mountain Sound', 'City Rhythm', 'Golden Era'
  ];
  return shuffleArray(fakeArtists).slice(0, count);
}

function getRandomFakeGenres(count: number, exclude: string[]): string[] {
  const genres = [
    'heavy metal', 'classical', 'jazz fusion', 'bluegrass', 'reggaeton',
    'k-pop', 'death metal', 'ambient', 'techno', 'country', 'opera',
    'drum and bass', 'ska', 'grunge', 'baroque'
  ].filter(g => !exclude.includes(g));
  return shuffleArray(genres).slice(0, count);
}

function getRandomFakeAlbums(count: number): string[] {
  const fakeAlbums = [
    'Echoes in Time', 'Dreams Unfold', 'Night Sessions', 'Day One',
    'The Last Chapter', 'First Light', 'Beyond Tomorrow', 'Inside Out',
    'Breaking Through', 'Standing Tall', 'Moving Forward', 'Looking Back'
  ];
  return shuffleArray(fakeAlbums).slice(0, count);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Main function to generate questions for an artist
export async function generateQuestions(
  artistId: string,
  count: number = 50
): Promise<any[]> {
  // Check cache first
  const cachedQuestions = await db.quizQuestion.findMany({
    where: { artistId, isActive: true },
    take: count,
    orderBy: { usageCount: 'asc' } // Prefer less-used questions
  });
  
  if (cachedQuestions.length >= count) {
    return cachedQuestions;
  }
  
  // Need to generate more questions
  const artistName = cachedQuestions[0]?.artistName || artistId;
  
  try {
    const artistData = await getArtistData(artistName);
    const newQuestions = generateQuestionsFromData(artistData);
    
    // Save to database
    for (const q of newQuestions) {
      await db.quizQuestion.upsert({
        where: {
          // Use a composite check to avoid duplicates
          id: `${artistId}_${q.question.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`
        },
        create: {
          id: `${artistId}_${q.question.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`,
          artistId,
          artistName: artistData.name,
          type: q.type,
          difficulty: q.difficulty,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          source: q.source
        },
        update: {}
      });
    }
    
    // Return combined questions
    return [...cachedQuestions, ...newQuestions.map(q => ({
      ...q,
      id: `${artistId}_${q.question.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`,
      artistId,
      artistName: artistData.name
    }))].slice(0, count);
    
  } catch (error) {
    console.error('Question generation failed:', error);
    // Return whatever we have cached
    return cachedQuestions;
  }
}
```

---

## Step 4: Quiz Session API

Create `app/api/quiz/start/route.ts`:

```typescript
// app/api/quiz/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getListeningMultiplier } from '@/lib/quiz/points';
import { generateQuestions } from '@/lib/quiz/questions';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { artistId, artistName } = await req.json();
    
    if (!artistId || !artistName) {
      return NextResponse.json({ error: 'Artist info required' }, { status: 400 });
    }
    
    // Check for existing active session
    const existingSession = await db.quickfireSession.findFirst({
      where: {
        userId: session.user.id,
        status: 'active'
      }
    });
    
    if (existingSession) {
      return NextResponse.json({ 
        error: 'Active session exists',
        existingSessionId: existingSession.id 
      }, { status: 409 });
    }
    
    // Get user's listening hours for this artist (from Spotify data)
    const listeningHours = await getArtistListeningHours(session.user.id, artistId);
    const listeningMultiplier = getListeningMultiplier(listeningHours);
    
    // Generate or fetch questions
    const questions = await generateQuestions(artistId, 50); // Pool of 50 questions
    
    if (questions.length < 10) {
      return NextResponse.json({ 
        error: 'Insufficient questions for this artist' 
      }, { status: 400 });
    }
    
    // Create session
    const quizSession = await db.quickfireSession.create({
      data: {
        userId: session.user.id,
        artistId,
        artistName,
        totalDuration: 120,
        artistListeningHours: listeningHours,
        listeningMultiplier,
        status: 'active'
      }
    });
    
    // Shuffle and get first question
    const shuffledQuestions = shuffleArray(questions);
    const firstQuestion = shuffledQuestions[0];
    
    // Update question usage count
    await db.quizQuestion.update({
      where: { id: firstQuestion.id },
      data: { usageCount: { increment: 1 } }
    });
    
    return NextResponse.json({
      sessionId: quizSession.id,
      totalTime: 120,
      listeningMultiplier,
      listeningHours,
      question: {
        id: firstQuestion.id,
        type: firstQuestion.type,
        difficulty: firstQuestion.difficulty,
        question: firstQuestion.question,
        options: firstQuestion.options
        // Note: correctAnswer NOT sent to client
      },
      questionPool: shuffledQuestions.slice(1).map(q => q.id) // IDs for subsequent questions
    });
    
  } catch (error) {
    console.error('Quiz start error:', error);
    return NextResponse.json({ error: 'Failed to start quiz' }, { status: 500 });
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function getArtistListeningHours(userId: string, artistId: string): Promise<number> {
  // Calculate from DailyListening data where topArtistId matches
  // This gives us an approximation based on days where this artist was the top artist
  
  const listeningDays = await db.dailyListening.findMany({
    where: {
      userId,
      topArtistId: artistId
    },
    select: {
      minutes: true
    }
  });
  
  // Sum minutes and convert to hours
  const totalMinutes = listeningDays.reduce((sum, day) => sum + day.minutes, 0);
  const hours = totalMinutes / 60;
  
  // Alternatively, check if the artist is in user's top artists for bonus multiplier
  const topArtist = await db.userTopArtist.findFirst({
    where: {
      userId,
      spotifyId: artistId,
      timeRange: 'long_term'
    }
  });
  
  // Give bonus hours if they're a top artist (indicates significant listening)
  if (topArtist) {
    // Top 5 = +50 hours, Top 10 = +30 hours, Top 20 = +10 hours
    if (topArtist.rank <= 5) return Math.max(hours, 100);
    if (topArtist.rank <= 10) return Math.max(hours, 50);
    if (topArtist.rank <= 20) return Math.max(hours, 20);
  }
  
  return hours;
}
```

Create `app/api/quiz/answer/route.ts`:

```typescript
// app/api/quiz/answer/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculatePoints, TIME_PENALTY_SECONDS } from '@/lib/quiz/points';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { 
      sessionId, 
      questionId, 
      selectedAnswer, 
      timeRemaining,
      timeTaken,
      nextQuestionId 
    } = await req.json();
    
    // Get session with active powerups
    const quizSession = await db.quickfireSession.findUnique({
      where: { id: sessionId },
      include: {
        powerupUsages: { include: { powerup: true } },
        answers: true
      }
    });
    
    if (!quizSession || quizSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    if (quizSession.status !== 'active') {
      return NextResponse.json({ error: 'Session not active' }, { status: 400 });
    }
    
    // Get question
    const question = await db.quizQuestion.findUnique({
      where: { id: questionId }
    });
    
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 400 });
    }
    
    const isCorrect = selectedAnswer === question.correctAnswer;
    const currentStreak = isCorrect 
      ? (quizSession.answers.filter(a => a.isCorrect).length > 0 
          ? getConsecutiveCorrect(quizSession.answers) + 1 
          : 1)
      : 0;
    
    // Check for active multiplier powerup
    let activeMultiplier = 1.0;
    const activePowerups = getActivePowerups(quizSession.powerupUsages);
    
    if (activePowerups.multiplier_1_2x) {
      activeMultiplier = 1.2;
    }
    if (activePowerups.double_next) {
      activeMultiplier = 2.0;
      // Consume double_next (one-time use)
    }
    
    // Check for shield
    const hasShield = activePowerups.shield;
    
    // Calculate points
    const pointsResult = calculatePoints({
      difficulty: question.difficulty as any,
      isCorrect,
      currentStreak,
      artistListeningHours: quizSession.artistListeningHours,
      activeMultiplier
    });
    
    // Apply shield if wrong answer
    let timePenalty = 0;
    let actualPenaltyPoints = pointsResult.penaltyPoints;
    
    if (!isCorrect) {
      if (hasShield) {
        // Shield blocks penalties
        timePenalty = 0;
        actualPenaltyPoints = 0;
        // Consume shield
      } else {
        timePenalty = TIME_PENALTY_SECONDS;
      }
    }
    
    // Record answer
    await db.quizAnswer.create({
      data: {
        sessionId,
        questionId,
        selectedAnswer,
        isCorrect,
        difficulty: question.difficulty,
        basePoints: pointsResult.basePoints,
        bonusPoints: pointsResult.listeningBonus + pointsResult.streakBonus + pointsResult.multiplierBonus,
        penaltyPoints: actualPenaltyPoints,
        netPoints: isCorrect ? pointsResult.netPoints : -actualPenaltyPoints,
        timeTaken,
        streakAtAnswer: currentStreak,
        multiplierActive: activeMultiplier
      }
    });
    
    // Update session
    const newLongestStreak = Math.max(quizSession.longestStreak, currentStreak);
    
    await db.quickfireSession.update({
      where: { id: sessionId },
      data: {
        questionsAnswered: { increment: 1 },
        correctAnswers: isCorrect ? { increment: 1 } : undefined,
        wrongAnswers: !isCorrect ? { increment: 1 } : undefined,
        longestStreak: newLongestStreak,
        basePoints: { increment: pointsResult.basePoints },
        streakBonus: { increment: pointsResult.streakBonus },
        listeningBonus: { increment: pointsResult.listeningBonus },
        multiplierBonus: { increment: pointsResult.multiplierBonus },
        penaltyPoints: { increment: actualPenaltyPoints },
        timePenalties: { increment: timePenalty }
      }
    });
    
    // Get next question if provided
    let nextQuestion = null;
    if (nextQuestionId) {
      const nextQ = await db.quizQuestion.findUnique({
        where: { id: nextQuestionId }
      });
      
      if (nextQ) {
        await db.quizQuestion.update({
          where: { id: nextQ.id },
          data: { usageCount: { increment: 1 } }
        });
        
        nextQuestion = {
          id: nextQ.id,
          type: nextQ.type,
          difficulty: nextQ.difficulty,
          question: nextQ.question,
          options: nextQ.options
        };
      }
    }
    
    return NextResponse.json({
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      points: {
        earned: isCorrect ? pointsResult.netPoints : 0,
        penalty: actualPenaltyPoints,
        breakdown: pointsResult
      },
      timePenalty,
      streak: currentStreak,
      shieldUsed: hasShield && !isCorrect,
      nextQuestion
    });
    
  } catch (error) {
    console.error('Quiz answer error:', error);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}

function getConsecutiveCorrect(answers: any[]): number {
  let streak = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (answers[i].isCorrect) streak++;
    else break;
  }
  return streak;
}

function getActivePowerups(usages: any[]): Record<string, boolean> {
  // Determine which powerups are currently active
  const active: Record<string, boolean> = {};
  
  for (const usage of usages) {
    const slug = usage.powerup.slug;
    
    // Persistent powerups (like 1.2x multiplier)
    if (slug === 'multiplier_1_2x') {
      active.multiplier_1_2x = true;
    }
    
    // One-time powerups (check if not yet consumed this turn)
    if (slug === 'double_next' && !usage.consumed) {
      active.double_next = true;
    }
    
    if (slug === 'shield' && !usage.consumed) {
      active.shield = true;
    }
  }
  
  return active;
}
```

---

## Step 5: Complete Session API

Create `app/api/quiz/complete/route.ts`:

```typescript
// app/api/quiz/complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateLeaderboard } from '@/lib/quiz/leaderboard';
import { checkBadges } from '@/lib/quiz/badges';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sessionId, reason } = await req.json();
    
    const quizSession = await db.quickfireSession.findUnique({
      where: { id: sessionId },
      include: { answers: true, user: true }
    });
    
    if (!quizSession || quizSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    if (quizSession.status !== 'active') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 });
    }
    
    // Calculate final score
    const totalEarned = quizSession.basePoints + 
                        quizSession.streakBonus + 
                        quizSession.listeningBonus + 
                        quizSession.multiplierBonus;
    const finalScore = Math.max(0, totalEarned - quizSession.penaltyPoints);
    
    // Update session
    await db.quickfireSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        finalScore,
        completedAt: new Date()
      }
    });
    
    // Update user stats
    const userStats = await db.userQuizStats.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        totalPoints: finalScore,
        availablePoints: finalScore,
        quizzesCompleted: 1,
        totalQuestionsAnswered: quizSession.questionsAnswered,
        totalCorrect: quizSession.correctAnswers,
        totalWrong: quizSession.wrongAnswers,
        bestSingleScore: finalScore,
        longestStreak: quizSession.longestStreak,
        lastPlayedAt: new Date()
      },
      update: {
        totalPoints: { increment: finalScore },
        availablePoints: { increment: finalScore },
        quizzesCompleted: { increment: 1 },
        totalQuestionsAnswered: { increment: quizSession.questionsAnswered },
        totalCorrect: { increment: quizSession.correctAnswers },
        totalWrong: { increment: quizSession.wrongAnswers },
        bestSingleScore: { 
          set: Math.max(finalScore, (await db.userQuizStats.findUnique({ where: { userId: session.user.id } }))?.bestSingleScore || 0) 
        },
        longestStreak: {
          set: Math.max(quizSession.longestStreak, (await db.userQuizStats.findUnique({ where: { userId: session.user.id } }))?.longestStreak || 0)
        },
        lastPlayedAt: new Date()
      }
    });
    
    // Update leaderboards
    const leaderboardResults = await updateLeaderboard(
      session.user.id,
      finalScore,
      quizSession.artistId,
      userStats.country
    );
    
    // Check for new badges
    const newBadges = await checkBadges(session.user.id, quizSession, userStats);
    
    return NextResponse.json({
      finalScore,
      performance: {
        questionsAnswered: quizSession.questionsAnswered,
        correctAnswers: quizSession.correctAnswers,
        wrongAnswers: quizSession.wrongAnswers,
        accuracy: quizSession.questionsAnswered > 0 
          ? Math.round((quizSession.correctAnswers / quizSession.questionsAnswered) * 100)
          : 0,
        longestStreak: quizSession.longestStreak,
        breakdown: {
          basePoints: quizSession.basePoints,
          streakBonus: quizSession.streakBonus,
          listeningBonus: quizSession.listeningBonus,
          multiplierBonus: quizSession.multiplierBonus,
          penaltyPoints: quizSession.penaltyPoints
        }
      },
      economy: {
        pointsEarned: finalScore,
        totalPoints: userStats.totalPoints + finalScore,
        availablePoints: userStats.availablePoints + finalScore
      },
      leaderboard: leaderboardResults,
      badges: newBadges
    });
    
  } catch (error) {
    console.error('Quiz complete error:', error);
    return NextResponse.json({ error: 'Failed to complete quiz' }, { status: 500 });
  }
}
```

---

## Step 6: Leaderboard API

Create `app/api/leaderboard/route.ts`:

```typescript
// app/api/leaderboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = req.nextUrl.searchParams;
    
    const scope = searchParams.get('scope') || 'global';
    const period = searchParams.get('period') || 'monthly';
    const country = searchParams.get('country');
    const artistId = searchParams.get('artistId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    
    // Determine date range
    const now = new Date();
    let startDate: Date, endDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default: // all_time
        startDate = new Date(0);
        endDate = new Date();
    }
    
    // Find or create leaderboard
    let leaderboard = await db.leaderboard.findFirst({
      where: {
        scope,
        country: scope === 'country' || scope === 'artist_country' ? country : null,
        artistId: scope.includes('artist') ? artistId : null,
        period,
        startDate: { gte: startDate, lte: endDate }
      },
      include: {
        entries: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: { rank: 'asc' },
          take: limit,
          skip: (page - 1) * limit
        }
      }
    });
    
    if (!leaderboard) {
      // Create new leaderboard and calculate entries
      leaderboard = await createLeaderboard(scope, country, artistId, period, startDate, endDate);
    }
    
    // Get current user's position if logged in
    let userPosition = null;
    if (session?.user?.id) {
      const userEntry = await db.leaderboardEntry.findFirst({
        where: {
          leaderboardId: leaderboard.id,
          userId: session.user.id
        }
      });
      
      if (userEntry) {
        userPosition = {
          rank: userEntry.rank,
          totalScore: userEntry.totalScore,
          tier: userEntry.tier
        };
      }
    }
    
    // Format entries
    const entries = leaderboard.entries.map(entry => ({
      rank: entry.rank,
      userId: entry.userId,
      username: entry.user.name,
      imageUrl: entry.user.image,
      totalScore: entry.totalScore,
      quizzesPlayed: entry.quizzesPlayed,
      bestSingleQuiz: entry.bestSingleQuiz,
      accuracy: Math.round(entry.accuracy * 100),
      tier: entry.tier,
      movement: entry.previousRank 
        ? entry.previousRank - entry.rank 
        : null
    }));
    
    return NextResponse.json({
      leaderboard: {
        id: leaderboard.id,
        scope,
        country,
        artistId,
        period,
        startDate,
        endDate
      },
      entries,
      userPosition,
      pagination: {
        page,
        limit,
        total: await db.leaderboardEntry.count({ 
          where: { leaderboardId: leaderboard.id } 
        })
      }
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

async function createLeaderboard(
  scope: string,
  country: string | null,
  artistId: string | null,
  period: string,
  startDate: Date,
  endDate: Date
) {
  // Create the leaderboard
  const leaderboard = await db.leaderboard.create({
    data: {
      scope,
      country,
      artistId,
      period,
      startDate,
      endDate
    }
  });
  
  // Aggregate scores from sessions in this period
  const whereClause: any = {
    status: 'completed',
    completedAt: { gte: startDate, lte: endDate }
  };
  
  if (artistId) {
    whereClause.artistId = artistId;
  }
  
  // Get scores grouped by user
  const scores = await db.quickfireSession.groupBy({
    by: ['userId'],
    where: whereClause,
    _sum: { finalScore: true },
    _count: true,
    _max: { finalScore: true }
  });
  
  // Filter by country if needed
  let filteredScores = scores;
  if (country) {
    const usersInCountry = await db.userQuizStats.findMany({
      where: { country },
      select: { userId: true }
    });
    const userIds = new Set(usersInCountry.map(u => u.userId));
    filteredScores = scores.filter(s => userIds.has(s.userId));
  }
  
  // Sort and rank
  const sortedScores = filteredScores.sort(
    (a, b) => (b._sum.finalScore || 0) - (a._sum.finalScore || 0)
  );
  
  // Calculate accuracy and create entries
  const totalUsers = sortedScores.length;
  
  for (let i = 0; i < sortedScores.length; i++) {
    const score = sortedScores[i];
    const rank = i + 1;
    
    // Get detailed stats
    const userSessions = await db.quickfireSession.findMany({
      where: {
        userId: score.userId,
        ...whereClause
      },
      select: {
        correctAnswers: true,
        questionsAnswered: true
      }
    });
    
    const totalCorrect = userSessions.reduce((a, s) => a + s.correctAnswers, 0);
    const totalQuestions = userSessions.reduce((a, s) => a + s.questionsAnswered, 0);
    const accuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
    
    // Calculate tier
    const tier = calculateTier(totalUsers, rank);
    
    await db.leaderboardEntry.create({
      data: {
        leaderboardId: leaderboard.id,
        userId: score.userId,
        rank,
        totalScore: score._sum.finalScore || 0,
        quizzesPlayed: score._count,
        bestSingleQuiz: score._max.finalScore || 0,
        totalCorrect,
        accuracy,
        tier
      }
    });
  }
  
  return db.leaderboard.findUnique({
    where: { id: leaderboard.id },
    include: {
      entries: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { rank: 'asc' },
        take: 50
      }
    }
  });
}

function calculateTier(totalUsers: number, rank: number): string {
  if (rank <= 10) return 'legend';
  const percentile = (rank / totalUsers) * 100;
  if (percentile <= 1) return 'diamond';
  if (percentile <= 5) return 'platinum';
  if (percentile <= 20) return 'gold';
  if (percentile <= 40) return 'silver';
  return 'bronze';
}
```

---

## Step 7: Quickfire Quiz UI Component

Create `components/quiz/QuickfireQuiz.tsx`:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickfireQuizProps {
  sessionId: string;
  artistName: string;
  initialTime: number;
  listeningMultiplier: number;
  firstQuestion: Question;
  questionPool: string[];
  onComplete: (results: QuizResults) => void;
}

interface Question {
  id: string;
  type: string;
  difficulty: string;
  question: string;
  options: string[];
}

export function QuickfireQuiz({
  sessionId,
  artistName,
  initialTime,
  listeningMultiplier,
  firstQuestion,
  questionPool,
  onComplete
}: QuickfireQuizProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isPaused, setIsPaused] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question>(firstQuestion);
  const [remainingQuestionIds, setRemainingQuestionIds] = useState(questionPool);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const [activePowerups, setActivePowerups] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer effect
  useEffect(() => {
    if (isPaused || isFrozen || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isFrozen, timeRemaining]);

  const handleTimeUp = useCallback(async () => {
    // Complete the quiz
    const response = await fetch('/api/quiz/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, reason: 'time_expired' })
    });
    
    const results = await response.json();
    onComplete(results);
  }, [sessionId, onComplete]);

  const handleAnswer = async (selectedAnswer: string) => {
    if (isSubmitting || feedback) return;
    setIsSubmitting(true);

    const startTime = Date.now();
    
    try {
      const nextQuestionId = remainingQuestionIds[0];
      
      const response = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          selectedAnswer,
          timeRemaining,
          timeTaken: (Date.now() - startTime) / 1000,
          nextQuestionId
        })
      });

      const result = await response.json();

      // Apply time penalty if wrong
      if (!result.isCorrect && result.timePenalty > 0) {
        setTimeRemaining(prev => Math.max(0, prev - result.timePenalty));
      }

      // Update score and streak
      if (result.isCorrect) {
        setScore(prev => prev + result.points.earned);
        setStreak(result.streak);
      } else {
        setStreak(0);
      }

      setQuestionsAnswered(prev => prev + 1);

      // Show feedback
      setFeedback({
        correct: result.isCorrect,
        points: result.isCorrect ? result.points.earned : -result.points.penalty
      });

      // After brief feedback, show next question
      setTimeout(() => {
        setFeedback(null);
        
        if (result.nextQuestion) {
          setCurrentQuestion(result.nextQuestion);
          setRemainingQuestionIds(prev => prev.slice(1));
        } else if (timeRemaining > 0 && remainingQuestionIds.length > 1) {
          // Fetch more questions if needed
          fetchNextQuestion();
        }
        
        setIsSubmitting(false);
      }, result.isCorrect ? 300 : 500);

    } catch (error) {
      console.error('Answer submission error:', error);
      setIsSubmitting(false);
    }
  };

  const handlePowerup = async (powerupSlug: string) => {
    const response = await fetch('/api/quiz/powerup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        powerupSlug,
        timeRemaining,
        questionId: currentQuestion.id
      })
    });

    const result = await response.json();

    if (result.success) {
      const effect = result.effect;

      switch (effect.type) {
        case 'freeze_time':
          setIsFrozen(true);
          setTimeout(() => setIsFrozen(false), effect.value.duration * 1000);
          break;
        case 'add_time':
          setTimeRemaining(prev => prev + effect.value.seconds);
          break;
        case 'multiplier':
          setActivePowerups(prev => [...prev, powerupSlug]);
          break;
        // Handle other powerups...
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'text-red-500';
    if (timeRemaining <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        {/* Question counter */}
        <div className="text-sm text-zinc-400">
          Q: {questionsAnswered + 1}
        </div>

        {/* Timer */}
        <motion.div 
          className={`text-4xl font-bold ${getTimerColor()}`}
          animate={timeRemaining <= 10 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          {isFrozen && <span className="text-blue-400">❄️ </span>}
          {formatTime(timeRemaining)}
        </motion.div>

        {/* Score */}
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">{score}</div>
          {streak >= 3 && (
            <div className="text-sm text-orange-400">
              🔥 x{streak}
            </div>
          )}
        </div>
      </div>

      {/* Listening multiplier indicator */}
      {listeningMultiplier > 1 && (
        <div className="text-center text-sm text-purple-400 mb-4">
          🎧 {((listeningMultiplier - 1) * 100).toFixed(0)}% listening bonus active
        </div>
      )}

      {/* Question */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="text-xs text-zinc-500 mb-2">
            {currentQuestion.difficulty.toUpperCase()}
          </div>
          <h2 className="text-xl font-semibold mb-6">
            {currentQuestion.question}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isSubmitting || !!feedback}
                className={`
                  w-full p-4 rounded-lg text-left transition-colors
                  ${feedback
                    ? feedback.correct && option === currentQuestion.options[0]
                      ? 'bg-green-600'
                      : 'bg-zinc-800'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                  }
                  disabled:opacity-50
                `}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-zinc-400 mr-3">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Feedback overlay */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`
                fixed inset-0 flex items-center justify-center
                pointer-events-none z-50
              `}
            >
              <div className={`
                text-6xl font-bold
                ${feedback.correct ? 'text-green-400' : 'text-red-400'}
              `}>
                {feedback.correct ? (
                  <span>+{feedback.points} ✓</span>
                ) : (
                  <span>{feedback.points} ✗</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Powerup bar */}
        <PowerupBar 
          onUsePowerup={handlePowerup}
          activePowerups={activePowerups}
        />
      </div>
    </div>
  );
}

// Powerup bar component
function PowerupBar({ 
  onUsePowerup, 
  activePowerups 
}: { 
  onUsePowerup: (slug: string) => void;
  activePowerups: string[];
}) {
  // This would fetch user's inventory and show available powerups
  // Simplified for brevity
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
      {/* Powerup buttons would go here */}
    </div>
  );
}
```

---

## Step 8: Monthly Leaderboard Reset Cron

Create `app/api/cron/leaderboard-reset/route.ts`:

```typescript
// app/api/cron/leaderboard-reset/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Find all monthly leaderboards from last month
    const leaderboards = await db.leaderboard.findMany({
      where: {
        period: 'monthly',
        startDate: { gte: lastMonth, lt: now }
      },
      include: {
        entries: {
          orderBy: { rank: 'asc' },
          take: 10,
          include: { user: true }
        }
      }
    });

    for (const leaderboard of leaderboards) {
      if (leaderboard.entries.length === 0) continue;

      // Archive top entries
      await db.leaderboardHistory.create({
        data: {
          scope: leaderboard.scope,
          country: leaderboard.country,
          artistId: leaderboard.artistId,
          period: 'monthly',
          startDate: leaderboard.startDate,
          endDate: lastMonthEnd,
          winnerId: leaderboard.entries[0].userId,
          winnerScore: leaderboard.entries[0].totalScore,
          topEntries: leaderboard.entries.map(e => ({
            rank: e.rank,
            userId: e.userId,
            userName: e.user.name,
            totalScore: e.totalScore,
            tier: e.tier
          }))
        }
      });

      // Award tier badges
      for (const entry of leaderboard.entries) {
        // Award tier badge
        await db.badge.upsert({
          where: {
            userId_badgeType_artistId: {
              userId: entry.userId,
              badgeType: `${entry.tier}_player_${now.getMonth()}_${now.getFullYear()}`,
              artistId: leaderboard.artistId
            }
          },
          create: {
            userId: entry.userId,
            badgeType: `${entry.tier}_player_${now.getMonth()}_${now.getFullYear()}`,
            artistId: leaderboard.artistId,
            metadata: {
              month: now.getMonth(),
              year: now.getFullYear(),
              rank: entry.rank,
              score: entry.totalScore
            }
          },
          update: {}
        });

        // Award bonus points based on tier
        const bonusPoints = getTierBonusPoints(entry.tier);
        if (bonusPoints > 0) {
          await db.userQuizStats.update({
            where: { userId: entry.userId },
            data: {
              totalPoints: { increment: bonusPoints },
              availablePoints: { increment: bonusPoints }
            }
          });
        }

        // Award champion badge for #1
        if (entry.rank === 1) {
          await db.badge.create({
            data: {
              userId: entry.userId,
              badgeType: 'monthly_champion',
              artistId: leaderboard.artistId,
              metadata: {
                month: now.getMonth(),
                year: now.getFullYear(),
                scope: leaderboard.scope,
                country: leaderboard.country
              }
            }
          });
        }
      }

      // Delete old entries (reset for new month)
      await db.leaderboardEntry.deleteMany({
        where: { leaderboardId: leaderboard.id }
      });

      // Update leaderboard dates for new month
      await db.leaderboard.update({
        where: { id: leaderboard.id },
        data: {
          startDate: now,
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      leaderboardsProcessed: leaderboards.length 
    });

  } catch (error) {
    console.error('Leaderboard reset error:', error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}

function getTierBonusPoints(tier: string): number {
  switch (tier) {
    case 'legend': return 500;
    case 'diamond': return 200;
    case 'platinum': return 100;
    case 'gold': return 50;
    case 'silver': return 25;
    case 'bronze': return 10;
    default: return 0;
  }
}
```

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/leaderboard-reset",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

---

## Checklist

- [ ] Database schema migrated
- [ ] Points calculation service working
- [ ] Powerup purchase and usage working
- [ ] Quiz start API working
- [ ] Answer submission with penalties working
- [ ] Session completion and stats update working
- [ ] Country and global leaderboards working
- [ ] Monthly reset cron job configured
- [ ] Quiz UI with timer, feedback, powerups working
- [ ] Badge awarding working

---

## Testing Points

1. **Points Economy**
   - Average player earns ~60-70 points per session
   - Penalties reduce score appropriately
   - Listening multiplier applies correctly

2. **Powerups**
   - Cannot use more than max per session
   - Cooldowns work correctly
   - Effects apply immediately

3. **Leaderboards**
   - Country filtering works
   - Tier calculation correct
   - Monthly reset archives properly

4. **Penalties**
   - Time penalty applies on wrong answer
   - Points penalty scales with difficulty
   - Shield blocks penalties
