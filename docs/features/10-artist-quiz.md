# Feature: Artist Quiz & Leaderboard System

## Overview

A high-intensity **Quickfire Quiz** system where users answer as many questions as possible within **2 minutes**. Features data-driven questions sourced from free APIs (MusicBrainz, Last.fm, Wikipedia), a balanced points economy based on listening hours, purchasable powerups, wrong-answer penalties, and country-specific + global leaderboards.

---

## User Stories

### Primary Stories
- **As a user**, I want to test my knowledge about my favorite artists in a fast-paced 2-minute challenge
- **As a user**, I want to earn points based on correct answers AND my listening dedication
- **As a user**, I want to buy powerups with my hard-earned points to boost my performance
- **As a user**, I want to compete on my country's leaderboard and globally

### Secondary Stories
- **As a user**, I want risk/reward gameplay where wrong answers have real consequences
- **As a user**, I want powerups that feel impactful but not game-breaking
- **As a user**, I want to feel rewarded for being a dedicated listener, not just a quiz master

---

## Core Mechanics

### 1. Quickfire Quiz Format

```typescript
interface QuickfireSession {
  id: string;
  userId: string;
  artistId: string;
  artistName: string;
  
  // Timer
  totalTime: 120;              // ALWAYS 2 minutes (120 seconds)
  timeRemaining: number;
  
  // Scoring
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  currentStreak: number;
  basePointsEarned: number;
  bonusPointsEarned: number;
  penaltyPointsLost: number;
  finalScore: number;
  
  // Powerups used this session
  powerupsUsed: PowerupUsage[];
  
  // Status
  status: 'countdown' | 'active' | 'paused' | 'completed';
  startedAt: DateTime;
  completedAt?: DateTime;
}

// Flow: User selects artist → 3-2-1 countdown → 2 min timer starts → Answer ASAP → Next question instantly
```

### 2. Question System

```typescript
interface QuizQuestion {
  id: string;
  type: QuestionType;
  artistId: string;
  artistName: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  question: string;
  options: string[];          // 4 options for multiple choice
  correctAnswer: string;
  explanation: string;
  source: string;
  generatedAt: DateTime;
}

type QuestionType = 
  | 'multiple_choice'      // Standard 4-option question
  | 'true_false'           // True/False questions
  | 'year_guess'           // Guess the year
  | 'lyric_completion'     // Complete the lyric
  | 'song_from_album'      // Which song is from this album?
  | 'collaboration'        // Who did the artist collaborate with?
  | 'first_hit'            // What was their first hit?
  | 'award_guess';         // Grammy/Award related questions

// Questions appear in random order, mixing difficulties
// Harder questions = more base points
```

---

## Points Economy (Balanced & Challenging)

### 3. Points Earning System

The points system rewards **both quiz skill AND listening dedication**. Points are intentionally hard to earn.

```typescript
interface PointsCalculation {
  // BASE POINTS per correct answer (by difficulty)
  basePoints: {
    easy: 5,        // Easy questions
    medium: 8,      // Medium questions  
    hard: 12,       // Hard questions
    expert: 18      // Expert questions
  };
  
  // LISTENING HOURS BONUS (multiplier based on artist listening time)
  // Checked from Spotify data: user's total hours listened to this artist
  listeningMultiplier: {
    under_1_hour: 1.0,      // No bonus
    '1_to_5_hours': 1.05,   // +5% bonus
    '5_to_20_hours': 1.10,  // +10% bonus
    '20_to_50_hours': 1.15, // +15% bonus
    '50_to_100_hours': 1.20,// +20% bonus
    over_100_hours: 1.25    // +25% bonus (max)
  };
  
  // STREAK BONUS (consecutive correct answers)
  streakBonus: {
    '3_streak': '+2 bonus points',
    '5_streak': '+5 bonus points',
    '10_streak': '+10 bonus points',
    '15_streak': '+15 bonus points',
    '20_plus': '+20 bonus points'
  };
  
  // Final calculation per question:
  // points = (basePoints * listeningMultiplier) + streakBonus
}
```

### 4. Penalty System

**Wrong answers hurt.** This creates tension and strategic powerup usage.

```typescript
interface PenaltySystem {
  // TIME PENALTY
  timePenalty: -2;  // Lose 2 seconds per wrong answer
  
  // POINTS PENALTY (scales with difficulty)
  pointsPenalty: {
    easy: -3,       // Lose 3 points for missing easy
    medium: -4,     // Lose 4 points for missing medium
    hard: -5,       // Lose 5 points for missing hard
    expert: -6      // Lose 6 points for missing expert
  };
  
  // STREAK BREAK
  streakBreak: true;  // Streak resets to 0 on wrong answer
  
  // Example: User on 5-streak, answers wrong on hard question
  // Result: -2 seconds time, -5 points, streak reset to 0
}
```

### 5. Points Balance Rationale

```typescript
// Why points are hard to earn:
// 
// Scenario: Average player, 2-minute quiz
// - Answers ~15 questions (8 sec per question average)
// - Gets 60% correct = 9 correct, 6 wrong
// - Mix of difficulties (3 easy, 3 medium, 2 hard, 1 expert)
// 
// Earnings:
// - 3 easy × 5pts = 15
// - 3 medium × 8pts = 24  
// - 2 hard × 12pts = 24
// - 1 expert × 18pts = 18
// - Small streak bonus = ~5
// Subtotal: 86 points
// 
// Penalties:
// - 6 wrong answers average: ~25 points lost
// - Time lost: 12 seconds (less questions possible)
// 
// NET: ~60-70 points per average session
//
// Good player might earn: 100-150 points
// Expert player might earn: 200-300 points
//
// Powerups cost: 100-500+ points
// This means even good players need multiple sessions to buy powerups
```

---

## Powerup System

### 6. Available Powerups

Powerups are **purchased with points** before a quiz session starts. Strategic use is key.

```typescript
interface Powerup {
  id: string;
  name: string;
  description: string;
  cost: number;           // Points to purchase
  icon: string;
  effect: PowerupEffect;
  maxPerSession: number;  // How many can be used in one quiz
  cooldown?: number;      // Seconds before can use again (in-session)
}

const POWERUPS = {
  // TIME FREEZES
  freeze_3s: {
    name: 'Mini Freeze',
    description: 'Freeze timer for 3 seconds',
    cost: 150,
    icon: '🧊',
    effect: { type: 'freeze_time', duration: 3 },
    maxPerSession: 3,
    cooldown: 20
  },
  freeze_5s: {
    name: 'Deep Freeze',
    description: 'Freeze timer for 5 seconds',
    cost: 300,
    icon: '❄️',
    effect: { type: 'freeze_time', duration: 5 },
    maxPerSession: 2,
    cooldown: 30
  },
  
  // EXTRA TIME
  extra_15s: {
    name: 'Time Boost',
    description: 'Add 15 seconds to timer',
    cost: 250,
    icon: '⏱️',
    effect: { type: 'add_time', seconds: 15 },
    maxPerSession: 2,
    cooldown: 45
  },
  extra_30s: {
    name: 'Major Time Boost',
    description: 'Add 30 seconds to timer',
    cost: 450,
    icon: '⏰',
    effect: { type: 'add_time', seconds: 30 },
    maxPerSession: 1,
    cooldown: 60
  },
  extra_60s: {
    name: 'Ultimate Time',
    description: 'Add 60 seconds to timer (MAX)',
    cost: 800,
    icon: '🕐',
    effect: { type: 'add_time', seconds: 60 },
    maxPerSession: 1,
    cooldown: null  // One time use
  },
  
  // POINT MULTIPLIERS
  multiplier_1_2x: {
    name: 'Point Surge',
    description: '1.2x points for ALL remaining questions',
    cost: 500,
    icon: '📈',
    effect: { type: 'multiplier', value: 1.2, scope: 'all_remaining' },
    maxPerSession: 1,
    cooldown: null
  },
  double_next: {
    name: 'Double Down',
    description: '2x points for the NEXT question only',
    cost: 200,
    icon: '✨',
    effect: { type: 'multiplier', value: 2.0, scope: 'next_question' },
    maxPerSession: 3,
    cooldown: 15
  },
  
  // SAFETY NETS
  shield: {
    name: 'Safety Shield',
    description: 'Block penalty for next wrong answer',
    cost: 350,
    icon: '🛡️',
    effect: { type: 'block_penalty', count: 1 },
    maxPerSession: 2,
    cooldown: 30
  },
  fifty_fifty: {
    name: '50/50',
    description: 'Remove 2 wrong options',
    cost: 175,
    icon: '🎯',
    effect: { type: 'remove_options', count: 2 },
    maxPerSession: 3,
    cooldown: 20
  },
  skip: {
    name: 'Skip',
    description: 'Skip question without penalty (no points either)',
    cost: 125,
    icon: '⏭️',
    effect: { type: 'skip_question' },
    maxPerSession: 2,
    cooldown: 25
  }
};
```

### 7. Powerup Usage Flow

```typescript
interface PowerupUsage {
  powerupId: string;
  usedAtTime: number;      // Seconds remaining when used
  usedOnQuestionId: string;
  effectApplied: boolean;
}

// Before Quiz:
// 1. User sees their available powerups (purchased inventory)
// 2. User selects which powerups to bring into this session
// 3. Max 5 different powerup types per session

// During Quiz:
// 1. Powerup bar shows at bottom of screen
// 2. Tap powerup icon to activate
// 3. Visual effect confirms activation
// 4. Cooldown timer shows if applicable

// Powerup Strategy Examples:
// - Use 50/50 on hard/expert questions
// - Activate 1.2x multiplier early for max benefit
// - Save Shield for when on a hot streak
// - Use Time Freeze when stuck on a question
// - Use Double Down on questions you're confident about
```

### 8. Powerup Purchase System

```typescript
interface UserPowerupInventory {
  userId: string;
  inventory: {
    [powerupId: string]: number;  // Quantity owned
  };
  totalPointsSpent: number;
  purchaseHistory: PowerupPurchase[];
}

interface PowerupPurchase {
  powerupId: string;
  quantity: number;
  totalCost: number;
  purchasedAt: DateTime;
}

// Bulk Discounts
const BULK_DISCOUNTS = {
  '3_pack': 0.90,    // 10% off
  '5_pack': 0.85,    // 15% off
  '10_pack': 0.75    // 25% off
};

// Example: freeze_3s costs 150 points
// Buy 5-pack: 150 × 5 × 0.85 = 637 points (save 113 points)
```

---

## Leaderboard System

### 9. Country-Specific & Global Leaderboards

```typescript
interface Leaderboard {
  id: string;
  scope: LeaderboardScope;
  artistId?: string;         // For artist-specific boards
  period: LeaderboardPeriod;
  startDate: DateTime;
  endDate: DateTime;
  entries: LeaderboardEntry[];
}

type LeaderboardScope = 
  | 'global'                  // All users worldwide
  | 'country'                 // Users from same country
  | 'artist_global'           // Specific artist, worldwide
  | 'artist_country';         // Specific artist, same country

type LeaderboardPeriod = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'all_time';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  imageUrl: string | null;
  country: string;            // ISO country code
  countryFlag: string;        // Emoji flag
  
  // Stats
  totalScore: number;         // Sum of all quiz scores this period
  quizzesPlayed: number;
  avgScorePerQuiz: number;
  bestSingleQuiz: number;
  totalCorrect: number;
  accuracy: number;           // Percentage
  
  // Rank info
  previousRank: number;
  movement: number;           // +/- from previous
  tier: LeaderboardTier;
}

type LeaderboardTier = 
  | 'bronze'     // Bottom 60%
  | 'silver'     // Top 40%
  | 'gold'       // Top 20%
  | 'platinum'   // Top 5%
  | 'diamond'    // Top 1%
  | 'legend';    // Top 10 users
```

### 10. Leaderboard Views

```typescript
const LEADERBOARD_VIEWS = {
  // Main Views
  global_monthly: {
    title: 'Global Monthly',
    description: 'Top players worldwide this month',
    icon: '🌍',
    showCountryFlags: true
  },
  country_monthly: {
    title: 'My Country',
    description: 'Top players in {country} this month',
    icon: '🏠',
    showCityOrRegion: true
  },
  
  // Artist-Specific Views
  artist_global: {
    title: '{Artist} Fans Worldwide',
    description: 'Who knows {artist} best globally?',
    icon: '🎤',
    showCountryFlags: true
  },
  artist_country: {
    title: '{Artist} Fans in {Country}',
    description: 'Local {artist} experts',
    icon: '🏆'
  },
  
  // Filters available on all views
  filters: {
    period: ['daily', 'weekly', 'monthly', 'all_time'],
    friendsOnly: true,
    nearMe: true  // Users within same region
  }
};
```

### 11. Monthly Reset & Rewards

```typescript
interface MonthlyResetSystem {
  // Runs at 00:00 UTC on 1st of each month
  
  async function performMonthlyReset() {
    // 1. Archive current standings
    await archiveLeaderboards();
    
    // 2. Award tier badges
    await awardTierBadges();
    
    // 3. Award top player rewards
    await awardTopPlayerRewards();
    
    // 4. Reset leaderboard entries
    await resetLeaderboards();
  }
}

// Tier Badge Rewards (awarded at month end)
const TIER_REWARDS = {
  legend: {
    badge: 'Legend of the Month',
    bonusPoints: 500,
    profileBorder: 'animated_gold'
  },
  diamond: {
    badge: 'Diamond Player',
    bonusPoints: 200,
    profileBorder: 'diamond'
  },
  platinum: {
    badge: 'Platinum Player',
    bonusPoints: 100
  },
  gold: {
    badge: 'Gold Player',
    bonusPoints: 50
  },
  silver: {
    badge: 'Silver Player',
    bonusPoints: 25
  },
  bronze: {
    badge: 'Bronze Player',
    bonusPoints: 10
  }
};

// Top Player Rewards (per leaderboard)
const TOP_REWARDS = {
  first: {
    title: 'Champion',
    badge: 'Monthly Champion',
    bonusPoints: 1000,
    profileTrophy: true
  },
  second: {
    badge: 'Silver Medalist',
    bonusPoints: 500
  },
  third: {
    badge: 'Bronze Medalist',
    bonusPoints: 250
  },
  top_10: {
    badge: 'Top 10 Finisher',
    bonusPoints: 100
  }
};
```

---

## UI/UX Features

### 12. Quiz Interface

```typescript
const QUICKFIRE_UI = {
  // Timer Display
  timer: {
    position: 'top_center',
    size: 'large',
    format: 'mm:ss',
    animations: {
      normalColor: 'green',
      warningAt: 30,         // Yellow at 30 seconds
      warningColor: 'yellow',
      criticalAt: 10,        // Red at 10 seconds
      criticalColor: 'red',
      pulseAtCritical: true,
      shakeonPenalty: true   // Timer shakes when time penalty applied
    }
  },
  
  // Score Display
  score: {
    position: 'top_right',
    showLiveScore: true,
    showPointsEarned: true,   // "+12" floats up on correct
    showPointsLost: true,     // "-5" shows red on wrong
    streakCounter: true       // "🔥 x5"
  },
  
  // Question Counter
  counter: {
    position: 'top_left',
    format: 'Q: {answered}'   // Shows questions answered
  },
  
  // Answer Feedback
  feedback: {
    correct: {
      color: 'green',
      sound: '/sounds/correct.mp3',
      animation: 'pulse_green',
      duration: 300           // ms, then next question
    },
    wrong: {
      color: 'red',
      sound: '/sounds/wrong.mp3',
      animation: 'shake_red',
      showPenalty: true,      // "-2s" and "-5pts" overlay
      duration: 500
    }
  },
  
  // Powerup Bar
  powerupBar: {
    position: 'bottom',
    showCooldowns: true,
    showQuantity: true,
    quickTapActivate: true
  }
};
```

### 13. Penalty Animations

```typescript
const PENALTY_EFFECTS = {
  timeLost: {
    // Timer visually "drains" 2 seconds
    animation: 'timer_drain',
    text: '-2s',
    textColor: 'red',
    timerFlash: true
  },
  pointsLost: {
    animation: 'points_fall',
    text: '-{points}',
    textColor: 'red',
    showAtQuestion: true
  },
  streakBreak: {
    animation: 'streak_shatter',
    sound: '/sounds/streak_break.mp3',
    showMessage: 'Streak Lost!'
  },
  
  // Combined penalty feel
  wrongAnswerSequence: [
    { delay: 0, action: 'flash_red' },
    { delay: 100, action: 'show_time_penalty' },
    { delay: 200, action: 'show_points_penalty' },
    { delay: 300, action: 'break_streak_if_any' },
    { delay: 500, action: 'next_question' }
  ]
};
```

### 14. Powerup Activation Effects

```typescript
const POWERUP_EFFECTS = {
  freeze: {
    screenEffect: 'frost_overlay',
    timerEffect: 'ice_crystals',
    sound: '/sounds/freeze.mp3',
    message: 'TIME FROZEN'
  },
  extra_time: {
    timerEffect: 'glow_green',
    animation: 'time_add_pulse',
    sound: '/sounds/time_add.mp3',
    message: '+{seconds}s'
  },
  multiplier_1_2x: {
    screenEffect: 'golden_glow',
    scoreEffect: 'sparkle',
    sound: '/sounds/multiplier.mp3',
    message: '1.2x ACTIVE',
    persistentIndicator: true
  },
  double_next: {
    questionEffect: 'glow_gold',
    sound: '/sounds/double.mp3',
    message: '2x NEXT QUESTION'
  },
  shield: {
    screenEffect: 'shield_bubble',
    sound: '/sounds/shield.mp3',
    message: 'SHIELDED',
    persistentIndicator: true
  },
  fifty_fifty: {
    optionsEffect: 'fade_out_wrong',
    sound: '/sounds/fifty.mp3',
    message: '2 OPTIONS REMOVED'
  },
  skip: {
    questionEffect: 'slide_away',
    sound: '/sounds/skip.mp3',
    message: 'SKIPPED'
  }
};
```

### 15. Results Screen

```typescript
interface QuizResults {
  // Performance Summary
  performance: {
    finalScore: number;
    questionsAnswered: number;
    correctAnswers: number;
    wrongAnswers: number;
    accuracy: number;
    bestStreak: number;
    
    // Point Breakdown
    basePointsEarned: number;
    listeningBonusPoints: number;
    streakBonusPoints: number;
    powerupBonusPoints: number;
    penaltyPointsLost: number;
    netScore: number;
  };
  
  // Leaderboard Impact
  leaderboard: {
    countryRank: number;
    countryRankChange: number;  // +5 means moved up 5 spots
    globalRank: number;
    globalRankChange: number;
    tier: LeaderboardTier;
    nextTierIn: number;         // Points needed for next tier
  };
  
  // Economy
  economy: {
    pointsBalance: number;
    pointsEarnedThisSession: number;
    powerupsUsed: number;
    totalPowerupValue: number;  // Cost of powerups used
    netPointsGained: number;    // After powerup cost
  };
  
  // Achievements
  achievements: {
    badgesEarned: Badge[];
    milestonesReached: string[];
    newPersonalBests: string[];
  };
}
```

---

## Badge System

### 16. Quiz-Related Badges

```typescript
const QUIZ_BADGES = {
  // Performance Badges
  first_quiz: {
    name: 'First Steps',
    description: 'Complete your first quickfire quiz',
    rarity: 'common',
    icon: '🎯'
  },
  speed_demon: {
    name: 'Speed Demon',
    description: 'Answer 20+ questions in a single 2-minute quiz',
    rarity: 'rare',
    icon: '⚡'
  },
  perfectionist: {
    name: 'Perfectionist',
    description: 'Achieve 100% accuracy with 15+ questions answered',
    rarity: 'epic',
    icon: '💎'
  },
  no_mistakes: {
    name: 'Flawless',
    description: 'Complete a quiz with 0 wrong answers (min 10 questions)',
    rarity: 'rare',
    icon: '✨'
  },
  
  // Streak Badges
  streak_5: {
    name: 'On Fire',
    description: 'Get a 5-question streak',
    rarity: 'common',
    icon: '🔥'
  },
  streak_10: {
    name: 'Unstoppable',
    description: 'Get a 10-question streak',
    rarity: 'uncommon',
    icon: '🔥🔥'
  },
  streak_20: {
    name: 'Legendary Streak',
    description: 'Get a 20-question streak',
    rarity: 'epic',
    icon: '🔥🔥🔥'
  },
  
  // Economy Badges
  big_spender: {
    name: 'Big Spender',
    description: 'Spend 5000 points on powerups',
    rarity: 'rare',
    icon: '💰'
  },
  powerup_master: {
    name: 'Powerup Master',
    description: 'Use 50 powerups total',
    rarity: 'uncommon',
    icon: '🎮'
  },
  
  // Leaderboard Badges
  country_champion: {
    name: 'National Champion',
    description: 'Reach #1 on your country leaderboard',
    rarity: 'legendary',
    icon: '🏆'
  },
  global_legend: {
    name: 'Global Legend',
    description: 'Reach #1 on the global leaderboard',
    rarity: 'legendary',
    icon: '🌟'
  },
  top_10_country: {
    name: 'Country Elite',
    description: 'Reach top 10 in your country',
    rarity: 'epic',
    icon: '🥇'
  },
  
  // Dedication Badges
  daily_grinder: {
    name: 'Daily Grinder',
    description: 'Play quizzes 7 days in a row',
    rarity: 'uncommon',
    icon: '📅'
  },
  quiz_veteran: {
    name: 'Quiz Veteran',
    description: 'Complete 100 quizzes',
    rarity: 'rare',
    icon: '🎖️'
  },
  
  // Artist-Specific
  superfan: {
    name: '{Artist} Superfan',
    description: 'Score 90%+ on 10 quizzes about {artist}',
    rarity: 'epic',
    icon: '⭐',
    dynamic: true
  }
};
```

---

## Technical Implementation

### 17. Database Schema

```prisma
// Add to schema.prisma

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
  createdAt     DateTime @default(now()) @map("created_at")
  
  answers       QuizAnswer[]
  
  @@index([artistId, difficulty])
  @@map("quiz_questions")
}

model QuickfireSession {
  id                String   @id @default(cuid())
  userId            String   @map("user_id")
  artistId          String   @map("artist_id")
  artistName        String   @map("artist_name")
  
  // Time tracking
  totalDuration     Int      @default(120) @map("total_duration") // Always 120 sec
  bonusTimeAdded    Int      @default(0) @map("bonus_time_added")
  timePenalties     Int      @default(0) @map("time_penalties")
  
  // Question stats
  questionsAnswered Int      @default(0) @map("questions_answered")
  correctAnswers    Int      @default(0) @map("correct_answers")
  wrongAnswers      Int      @default(0) @map("wrong_answers")
  longestStreak     Int      @default(0) @map("longest_streak")
  
  // Points (before powerup costs)
  basePoints        Int      @default(0) @map("base_points")
  streakBonus       Int      @default(0) @map("streak_bonus")
  listeningBonus    Int      @default(0) @map("listening_bonus")
  multiplierBonus   Int      @default(0) @map("multiplier_bonus")
  penaltyPoints     Int      @default(0) @map("penalty_points")
  finalScore        Int      @default(0) @map("final_score")
  
  // Listening hours for this artist (snapshot at quiz time)
  artistListeningHours Float @default(0) @map("artist_listening_hours")
  listeningMultiplier  Float @default(1.0) @map("listening_multiplier")
  
  status            String   @default("active")
  startedAt         DateTime @default(now()) @map("started_at")
  completedAt       DateTime? @map("completed_at")
  
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  answers           QuizAnswer[]
  powerupUsages     PowerupUsage[]
  
  @@index([userId, completedAt])
  @@index([artistId, finalScore])
  @@map("quickfire_sessions")
}

model QuizAnswer {
  id              String   @id @default(cuid())
  sessionId       String   @map("session_id")
  questionId      String   @map("question_id")
  selectedAnswer  String   @map("selected_answer")
  isCorrect       Boolean  @map("is_correct")
  difficulty      String
  basePoints      Int      @map("base_points")
  bonusPoints     Int      @default(0) @map("bonus_points")
  penaltyPoints   Int      @default(0) @map("penalty_points")
  netPoints       Int      @map("net_points")
  timeTaken       Float    @map("time_taken") // seconds with decimals
  streakAtAnswer  Int      @default(0) @map("streak_at_answer")
  multiplierActive Float   @default(1.0) @map("multiplier_active")
  answeredAt      DateTime @default(now()) @map("answered_at")
  
  session         QuickfireSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  question        QuizQuestion     @relation(fields: [questionId], references: [id])
  
  @@index([sessionId])
  @@map("quiz_answers")
}

model UserQuizStats {
  id                  String   @id @default(cuid())
  userId              String   @unique @map("user_id")
  
  // Cumulative stats
  totalPoints         Int      @default(0) @map("total_points")
  pointsSpentOnPowerups Int    @default(0) @map("points_spent_powerups")
  availablePoints     Int      @default(0) @map("available_points")
  
  // Performance
  quizzesCompleted    Int      @default(0) @map("quizzes_completed")
  totalQuestionsAnswered Int   @default(0) @map("total_questions_answered")
  totalCorrect        Int      @default(0) @map("total_correct")
  totalWrong          Int      @default(0) @map("total_wrong")
  bestSingleScore     Int      @default(0) @map("best_single_score")
  longestStreak       Int      @default(0) @map("longest_streak")
  
  // Streaks
  currentDailyStreak  Int      @default(0) @map("current_daily_streak")
  longestDailyStreak  Int      @default(0) @map("longest_daily_streak")
  lastPlayedAt        DateTime? @map("last_played_at")
  
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_quiz_stats")
}

// Powerup System
model Powerup {
  id              String   @id @default(cuid())
  name            String   @unique
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
  id              String   @id @default(cuid())
  sessionId       String   @map("session_id")
  powerupId       String   @map("powerup_id")
  usedAtTimeLeft  Int      @map("used_at_time_left") // Seconds remaining
  usedOnQuestionId String? @map("used_on_question_id")
  usedAt          DateTime @default(now()) @map("used_at")
  
  session         QuickfireSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  powerup         Powerup          @relation(fields: [powerupId], references: [id])
  
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
  id              String   @id @default(cuid())
  leaderboardId   String   @map("leaderboard_id")
  userId          String   @map("user_id")
  rank            Int
  previousRank    Int?     @map("previous_rank")
  totalScore      Int      @map("total_score")
  quizzesPlayed   Int      @map("quizzes_played")
  bestSingleQuiz  Int      @map("best_single_quiz")
  totalCorrect    Int      @map("total_correct")
  accuracy        Float
  tier            String   @default("bronze")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  leaderboard     Leaderboard @relation(fields: [leaderboardId], references: [id], onDelete: Cascade)
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
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

### 18. Core Calculation Functions

```typescript
// lib/quiz/points.ts

interface PointsInput {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  isCorrect: boolean;
  currentStreak: number;
  artistListeningHours: number;
  activeMultiplier: number;  // From powerups
}

export function calculatePoints(input: PointsInput): {
  basePoints: number;
  listeningBonus: number;
  streakBonus: number;
  multiplierBonus: number;
  penaltyPoints: number;
  netPoints: number;
} {
  const BASE_POINTS = {
    easy: 5,
    medium: 8,
    hard: 12,
    expert: 18
  };
  
  const PENALTY_POINTS = {
    easy: 3,
    medium: 4,
    hard: 5,
    expert: 6
  };
  
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

function getListeningMultiplier(hours: number): number {
  if (hours >= 100) return 1.25;
  if (hours >= 50) return 1.20;
  if (hours >= 20) return 1.15;
  if (hours >= 5) return 1.10;
  if (hours >= 1) return 1.05;
  return 1.0;
}

function getStreakBonus(streak: number): number {
  if (streak >= 20) return 20;
  if (streak >= 15) return 15;
  if (streak >= 10) return 10;
  if (streak >= 5) return 5;
  if (streak >= 3) return 2;
  return 0;
}

// Time penalty
export const TIME_PENALTY_SECONDS = 2;
```

### 19. API Routes

```typescript
// Quiz Session APIs
// POST /api/quiz/start - Start new quickfire session
// POST /api/quiz/answer - Submit answer (returns next question)
// POST /api/quiz/powerup - Use a powerup
// POST /api/quiz/complete - End session (or auto-ends at time=0)
// GET  /api/quiz/session/{id} - Get session details

// Powerup APIs
// GET  /api/powerups - List all available powerups
// GET  /api/powerups/inventory - User's powerup inventory
// POST /api/powerups/purchase - Buy powerups

// Leaderboard APIs
// GET /api/leaderboard?scope=global&period=monthly
// GET /api/leaderboard?scope=country&country=US&period=monthly
// GET /api/leaderboard?scope=artist_global&artistId=xxx
// GET /api/leaderboard?scope=artist_country&artistId=xxx&country=US
// GET /api/leaderboard/me - Current user's ranks across boards

// Stats APIs
// GET /api/quiz/stats - User's quiz statistics
// GET /api/quiz/history - Past quiz sessions
```

---

## Integration with Existing Features

### Connection to Spotify Listening Data
- Fetch user's listening hours per artist from Spotify
- Higher listening time = better points multiplier
- Incentivizes playing quizzes for artists you actually listen to

### Connection to Top Artists
- Quiz suggestions based on user's top artists
- "Challenge yourself" prompts on artist cards
- Artist-specific leaderboards for favorites

### Connection to Profile
- Display quiz stats and badges on public profile
- Country and global ranks visible
- Points balance shown

---

## Acceptance Criteria

1. ✅ Quiz is always 2 minutes (120 seconds) format
2. ✅ Questions appear instantly after answering
3. ✅ Points scale with difficulty (5/8/12/18)
4. ✅ Wrong answers cause -2 second penalty AND point loss
5. ✅ Listening hours provide 1.0x to 1.25x multiplier
6. ✅ Streak bonuses at 3/5/10/15/20 correct
7. ✅ All powerups work correctly with cooldowns
8. ✅ Powerups cost points and can be purchased
9. ✅ Country-specific leaderboards work
10. ✅ Global leaderboards work
11. ✅ Monthly reset archives and awards badges
12. ✅ Point economy is balanced (avg player ~60-70 pts/session)

---

## Edge Cases

See [/docs/edge-cases/quiz.md](../edge-cases/quiz.md) for:
- Handling network latency during fast answers
- Powerup activation race conditions
- Leaderboard tie-breaking rules
- Monthly reset timing edge cases
- Preventing powerup exploitation
- Session recovery on disconnect
