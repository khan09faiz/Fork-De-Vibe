# Edge Cases: Artist Quiz System (Quickfire Format)

**Purpose:** Handle edge cases in the 2-minute quickfire quiz, powerup system, and leaderboards

---

## Quickfire Session Edge Cases

### 1. Network Latency During Fast Gameplay

**Problem:** High latency causes answer timing discrepancies

```typescript
interface LatencyHandling {
  // Client-side timestamp for answer submission
  answerPayload: {
    questionId: string;
    selectedAnswer: string;
    clientTimestamp: number;     // When user clicked
    clientTimeRemaining: number; // What client showed
  };
  
  // Server reconciliation
  async processAnswer(sessionId: string, payload: AnswerPayload) {
    const session = await getSession(sessionId);
    const serverTime = Date.now();
    const latency = serverTime - payload.clientTimestamp;
    
    // Allow up to 2 seconds of latency grace
    const MAX_LATENCY_GRACE = 2000;
    
    if (latency > MAX_LATENCY_GRACE) {
      // Log suspicious activity but process answer
      await logLatencyAnomaly(sessionId, latency);
    }
    
    // Use client timestamp if within grace period
    const effectiveTime = latency <= MAX_LATENCY_GRACE 
      ? payload.clientTimeRemaining 
      : calculateServerTimeRemaining(session);
    
    return processWithTime(session, payload, effectiveTime);
  }
}
```

### 2. Session Recovery on Disconnect

**Problem:** User loses connection during active quiz

```typescript
interface QuickfireRecovery {
  // Session state stored every answer
  sessionState: {
    timeRemaining: number;
    questionsAnswered: number;
    currentScore: number;
    activePowerups: PowerupState[];
    lastQuestionId: string;
  };
  
  // Recovery window: 30 seconds for quickfire (time-sensitive)
  RECOVERY_WINDOW_SECONDS: 30;
  
  async attemptRecovery(userId: string) {
    const session = await db.quickfireSession.findFirst({
      where: {
        userId,
        status: 'active',
        updatedAt: { gte: subSeconds(new Date(), 30) }
      }
    });
    
    if (!session) {
      return { canRecover: false, reason: 'Session expired' };
    }
    
    // Calculate actual time remaining
    const elapsedSinceDisconnect = differenceInSeconds(new Date(), session.updatedAt);
    const adjustedTimeRemaining = session.timeRemaining - elapsedSinceDisconnect;
    
    if (adjustedTimeRemaining <= 0) {
      // Auto-complete the session
      await completeSession(session.id, 'timeout_disconnect');
      return { canRecover: false, reason: 'Time ran out' };
    }
    
    return {
      canRecover: true,
      session: { ...session, timeRemaining: adjustedTimeRemaining }
    };
  }
}
```

### 3. Time Penalty Edge Cases

**Problem:** Time penalty could push time below zero

```typescript
function applyTimePenalty(currentTime: number): { newTime: number; penaltyApplied: number } {
  const PENALTY = 2; // seconds
  
  if (currentTime <= 0) {
    return { newTime: 0, penaltyApplied: 0 };
  }
  
  if (currentTime <= PENALTY) {
    // Partial penalty - drain remaining time
    return { newTime: 0, penaltyApplied: currentTime };
  }
  
  return { newTime: currentTime - PENALTY, penaltyApplied: PENALTY };
}

// Time hitting zero ends session
function checkTimeRemaining(session: QuickfireSession, newTime: number) {
  if (newTime <= 0) {
    return completeSession(session.id, 'time_expired');
  }
}
```

### 4. Multiple Wrong Answers Rapidly

**Problem:** User spam-clicking could trigger multiple penalties

```typescript
interface RapidAnswerProtection {
  // Minimum time between answers (prevent spam)
  MIN_ANSWER_INTERVAL_MS: 300;
  
  async submitAnswer(sessionId: string, answer: AnswerPayload) {
    const lastAnswer = await db.quizAnswer.findFirst({
      where: { sessionId },
      orderBy: { answeredAt: 'desc' }
    });
    
    if (lastAnswer) {
      const timeSinceLastAnswer = Date.now() - lastAnswer.answeredAt.getTime();
      
      if (timeSinceLastAnswer < 300) {
        return { 
          error: 'too_fast', 
          message: 'Please wait before answering',
          retryAfter: 300 - timeSinceLastAnswer 
        };
      }
    }
    
    // Process answer normally
    return processAnswer(sessionId, answer);
  }
}
```

---

## Powerup Edge Cases

### 5. Powerup Activation Race Conditions

**Problem:** User activates powerup at exact moment of answer submission

```typescript
interface PowerupActivation {
  // Atomic powerup + answer handling
  async activatePowerupWithAnswer(
    sessionId: string, 
    powerupId: string, 
    answer?: AnswerPayload
  ) {
    return await db.$transaction(async (tx) => {
      // Lock session for atomic update
      const session = await tx.quickfireSession.findUnique({
        where: { id: sessionId },
        include: { powerupUsages: true }
      });
      
      // Check powerup still valid
      const inventory = await tx.userPowerupInventory.findUnique({
        where: { 
          userId_powerupId: { 
            userId: session.userId, 
            powerupId 
          } 
        }
      });
      
      if (!inventory || inventory.quantity <= 0) {
        throw new Error('Powerup not available');
      }
      
      // Check cooldown
      const lastUsage = session.powerupUsages
        .filter(u => u.powerupId === powerupId)
        .sort((a, b) => b.usedAt - a.usedAt)[0];
      
      if (lastUsage && isOnCooldown(lastUsage, powerupId)) {
        throw new Error('Powerup on cooldown');
      }
      
      // Check max per session
      const usageCount = session.powerupUsages.filter(u => u.powerupId === powerupId).length;
      const powerup = await tx.powerup.findUnique({ where: { id: powerupId } });
      
      if (usageCount >= powerup.maxPerSession) {
        throw new Error('Max uses reached for this session');
      }
      
      // All checks passed - apply atomically
      await tx.userPowerupInventory.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: 1 } }
      });
      
      await tx.powerupUsage.create({
        data: {
          sessionId,
          powerupId,
          usedAtTimeLeft: session.timeRemaining,
          usedAt: new Date()
        }
      });
      
      return { success: true, effect: powerup.effectType };
    });
  }
}
```

### 6. Freeze Powerup During Answer Animation

**Problem:** User activates freeze while answer feedback is showing

```typescript
interface FreezeTimingEdge {
  // Freeze only affects active gameplay time
  state: {
    isShowingFeedback: boolean;  // 300-500ms after answer
    isFrozen: boolean;
    feedbackEndTime: number;
  };
  
  activateFreeze(session: SessionState) {
    if (session.isShowingFeedback) {
      // Queue freeze to start after feedback
      return {
        queued: true,
        startsAt: session.feedbackEndTime,
        message: 'Freeze will activate after feedback'
      };
    }
    
    return {
      queued: false,
      startsAt: Date.now(),
      message: 'TIME FROZEN'
    };
  }
}
```

### 7. Shield + Double Down Interaction

**Problem:** User has Shield active and uses Double Down, then answers wrong

```typescript
interface PowerupInteraction {
  // Shield protects from penalty but Double Down is wasted
  handleWrongAnswerWithPowerups(
    session: SessionState, 
    activePowerups: ActivePowerup[]
  ) {
    const hasShield = activePowerups.some(p => p.type === 'shield');
    const hasDouble = activePowerups.some(p => p.type === 'double_next');
    
    let result = {
      timePenalty: 2,
      pointsPenalty: getPenaltyForDifficulty(question.difficulty),
      doubleWasted: false,
      shieldConsumed: false
    };
    
    if (hasShield) {
      // Shield blocks all penalties
      result.timePenalty = 0;
      result.pointsPenalty = 0;
      result.shieldConsumed = true;
      
      // Remove shield from active powerups
      consumePowerup(session, 'shield');
    }
    
    if (hasDouble) {
      // Double is consumed regardless of answer
      result.doubleWasted = true;
      consumePowerup(session, 'double_next');
    }
    
    return result;
  }
}
```

### 8. 50/50 on True/False Questions

**Problem:** 50/50 would leave only the correct answer

```typescript
interface FiftyFiftyLogic {
  applyFiftyFifty(question: QuizQuestion) {
    if (question.type === 'true_false') {
      // Cannot use 50/50 on true/false
      return {
        error: 'invalid_powerup',
        message: 'Cannot use 50/50 on True/False questions',
        refund: true  // Return powerup to inventory
      };
    }
    
    // Normal 4-option question
    const wrongOptions = question.options.filter(o => o !== question.correctAnswer);
    const optionsToRemove = shuffleArray(wrongOptions).slice(0, 2);
    
    return {
      success: true,
      remainingOptions: question.options.filter(o => !optionsToRemove.includes(o))
    };
  }
}
```

### 9. Extra Time Exceeding Maximum

**Problem:** Multiple time powerups could extend quiz indefinitely

```typescript
interface TimeExtensionLimits {
  // Maximum total time per session
  MAX_TOTAL_TIME: 300; // 5 minutes absolute max
  
  // Original time
  BASE_TIME: 120;
  
  // Max bonus time
  MAX_BONUS_TIME: 180; // Can add up to 3 minutes
  
  applyTimeBonus(session: QuickfireSession, bonusSeconds: number) {
    const currentBonusUsed = session.bonusTimeAdded;
    const remainingBonusAllowed = MAX_BONUS_TIME - currentBonusUsed;
    
    if (remainingBonusAllowed <= 0) {
      return {
        error: 'max_time_reached',
        message: 'Maximum time extension reached',
        refund: true
      };
    }
    
    const actualBonus = Math.min(bonusSeconds, remainingBonusAllowed);
    
    await db.quickfireSession.update({
      where: { id: session.id },
      data: {
        bonusTimeAdded: { increment: actualBonus }
      }
    });
    
    return {
      success: true,
      timeAdded: actualBonus,
      message: actualBonus < bonusSeconds 
        ? `+${actualBonus}s (capped at maximum)` 
        : `+${actualBonus}s`
    };
  }
}
```

---

## Points & Economy Edge Cases

### 10. Negative Total Score

**Problem:** Heavy penalties could result in negative score

```typescript
interface ScoreFloor {
  // Session score cannot go below 0
  calculateFinalScore(session: QuickfireSession): number {
    const grossScore = session.basePoints + 
                       session.streakBonus + 
                       session.listeningBonus + 
                       session.multiplierBonus;
    
    const netScore = grossScore - session.penaltyPoints;
    
    // Floor at 0
    return Math.max(0, netScore);
  }
  
  // Available points (for spending) also floored at 0
  getAvailablePoints(userStats: UserQuizStats): number {
    return Math.max(0, userStats.totalPoints - userStats.pointsSpentOnPowerups);
  }
}
```

### 11. Insufficient Points for Powerup Purchase

**Problem:** User tries to buy powerup they can't afford

```typescript
interface PowerupPurchase {
  async purchasePowerup(userId: string, powerupId: string, quantity: number) {
    const userStats = await getUserStats(userId);
    const powerup = await getPowerup(powerupId);
    const totalCost = calculateCost(powerup.cost, quantity);
    
    if (userStats.availablePoints < totalCost) {
      return {
        error: 'insufficient_points',
        message: `You need ${totalCost} points but only have ${userStats.availablePoints}`,
        shortfall: totalCost - userStats.availablePoints,
        suggestion: `Play ${Math.ceil((totalCost - userStats.availablePoints) / 70)} more quizzes to earn enough`
      };
    }
    
    // Process purchase
    return await executePurchase(userId, powerupId, quantity, totalCost);
  }
}
```

### 12. Listening Hours Data Unavailable

**Problem:** Spotify API fails to return listening data

```typescript
interface ListeningDataFallback {
  async getListeningMultiplier(userId: string, artistId: string): Promise<number> {
    try {
      const listeningHours = await spotifyApi.getArtistListeningTime(userId, artistId);
      return calculateMultiplier(listeningHours);
    } catch (error) {
      // Fallback: Check if artist is in user's top artists
      const topArtists = await getCachedTopArtists(userId);
      const isTopArtist = topArtists.some(a => a.id === artistId);
      
      if (isTopArtist) {
        // Assume moderate listening for top artists
        return 1.10; // 10% bonus
      }
      
      // Default: no bonus
      return 1.0;
    }
  }
}
```

---

## Leaderboard Edge Cases

### 13. Tie-Breaking Rules

**Problem:** Multiple users have identical scores

```typescript
interface TieBreaker {
  // Tie-breaking priority (in order):
  // 1. Total score (already tied)
  // 2. Best single quiz score
  // 3. Total correct answers
  // 4. Accuracy percentage
  // 5. Fewer quizzes played (efficiency)
  // 6. Earlier first quiz (seniority)
  
  sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries.sort((a, b) => {
      // 1. Total score (descending)
      if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
      
      // 2. Best single quiz (descending)
      if (a.bestSingleQuiz !== b.bestSingleQuiz) return b.bestSingleQuiz - a.bestSingleQuiz;
      
      // 3. Total correct answers (descending)
      if (a.totalCorrect !== b.totalCorrect) return b.totalCorrect - a.totalCorrect;
      
      // 4. Accuracy (descending)
      if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
      
      // 5. Fewer quizzes = more efficient (ascending)
      if (a.quizzesPlayed !== b.quizzesPlayed) return a.quizzesPlayed - b.quizzesPlayed;
      
      // 6. Earlier first quiz (ascending - older = priority)
      return a.firstQuizAt.getTime() - b.firstQuizAt.getTime();
    });
  }
  
  // Display tied ranks
  assignRanks(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    let currentRank = 1;
    
    return entries.map((entry, index) => {
      if (index > 0) {
        const prev = entries[index - 1];
        // Only increment if truly different after all tiebreakers
        if (!areEffectivelyTied(entry, prev)) {
          currentRank = index + 1;
        }
      }
      return { ...entry, rank: currentRank };
    });
  }
}
```

### 14. Country Detection Accuracy

**Problem:** User's country may be misdetected

```typescript
interface CountryHandling {
  // Allow manual country override
  userProfile: {
    detectedCountry: string;   // From IP geolocation
    selectedCountry: string;   // User's manual selection
    countryLocked: boolean;    // Prevent abuse
    countryChangedAt?: Date;
  };
  
  // Limit country changes to prevent leaderboard manipulation
  async changeCountry(userId: string, newCountry: string) {
    const user = await getUser(userId);
    
    // Can only change country once per 30 days
    if (user.countryChangedAt) {
      const daysSinceChange = differenceInDays(new Date(), user.countryChangedAt);
      
      if (daysSinceChange < 30) {
        return {
          error: 'country_locked',
          message: `You can change your country in ${30 - daysSinceChange} days`,
          currentCountry: user.selectedCountry
        };
      }
    }
    
    // Remove from old country leaderboard
    await removeFromCountryLeaderboard(userId, user.selectedCountry);
    
    // Update and add to new country leaderboard
    await updateUserCountry(userId, newCountry);
    await addToCountryLeaderboard(userId, newCountry);
    
    return { success: true, country: newCountry };
  }
}
```

### 15. Monthly Reset Timing

**Problem:** User completes quiz at 23:59:59 on last day of month

```typescript
interface MonthlyResetEdge {
  // Reset runs at 00:00:00 UTC on 1st of month
  // Grace period for in-progress sessions
  
  async performMonthlyReset() {
    const resetTime = startOfMonth(new Date());
    
    // Find sessions that started before midnight but might still be active
    const activeSessionsAtReset = await db.quickfireSession.findMany({
      where: {
        status: 'active',
        startedAt: {
          gte: subMinutes(resetTime, 5), // Started within 5 min of midnight
          lt: resetTime
        }
      }
    });
    
    // Complete these sessions with their current scores
    for (const session of activeSessionsAtReset) {
      await completeSession(session.id, 'month_reset');
    }
    
    // Archive leaderboards
    await archiveLeaderboards(getPreviousMonth());
    
    // Award badges and rewards
    await awardMonthlyRewards(getPreviousMonth());
    
    // Reset for new month
    await resetLeaderboards();
  }
  
  // Scores earned in final session count for previous month
  // (session started before reset)
}
```

---

## Anti-Cheat Edge Cases

### 16. Suspiciously Fast Answers

**Problem:** Bot or cheater answering inhumanly fast

```typescript
interface CheatDetection {
  // Human reaction time + reading = minimum 1.5 seconds
  MIN_HUMAN_ANSWER_TIME: 1.5;
  
  // Track suspicious patterns
  patterns: {
    consecutiveFastAnswers: number;
    averageAnswerTime: number;
    perfectAccuracyWithSpeed: boolean;
  };
  
  async analyzeAnswer(sessionId: string, timeTaken: number, isCorrect: boolean) {
    const session = await getSessionWithAnswers(sessionId);
    
    // Flag if answer under human threshold
    if (timeTaken < MIN_HUMAN_ANSWER_TIME && isCorrect) {
      session.suspiciousFlags++;
      
      // Check for pattern
      const recentAnswers = session.answers.slice(-5);
      const avgTime = recentAnswers.reduce((a, b) => a + b.timeTaken, 0) / recentAnswers.length;
      const accuracy = recentAnswers.filter(a => a.isCorrect).length / recentAnswers.length;
      
      if (avgTime < 2.0 && accuracy > 0.9) {
        // Highly suspicious - flag for review
        await flagForReview(sessionId, 'speed_cheat_suspected');
        
        // Don't immediately ban - could be legitimate expert
        // But don't count toward leaderboard until reviewed
        await excludeFromLeaderboard(sessionId, 'pending_review');
      }
    }
  }
}
```

### 17. Powerup Exploitation Attempts

**Problem:** User tries to exploit powerup system

```typescript
interface PowerupAntiExploit {
  // Cannot use powerup after viewing correct answer
  answerRevealProtection: {
    lockPowerupsOnReveal: true;
    revealedAt?: number;
  };
  
  // Cannot use 50/50 after already eliminating options mentally
  fiftyFiftyTiming: {
    // 50/50 only valid within first 3 seconds of question
    maxTimeToUse: 3000;
  };
  
  validatePowerupUse(session: SessionState, powerupId: string) {
    const currentQuestion = session.currentQuestion;
    const questionStartTime = session.questionStartedAt;
    const now = Date.now();
    
    // 50/50 time limit
    if (powerupId === 'fifty_fifty') {
      if (now - questionStartTime > 3000) {
        return {
          error: 'too_late',
          message: '50/50 must be used within 3 seconds of question appearing'
        };
      }
    }
    
    // Already answered this question
    if (session.answerSubmittedForCurrentQuestion) {
      return {
        error: 'already_answered',
        message: 'Cannot use powerup after answering'
      };
    }
    
    return { valid: true };
  }
}
```

### 18. Multiple Device Sessions

**Problem:** User tries to play same quiz on multiple devices

```typescript
interface SessionExclusivity {
  // Only one active session per user per artist
  async startSession(userId: string, artistId: string) {
    const existingSession = await db.quickfireSession.findFirst({
      where: {
        userId,
        artistId,
        status: 'active'
      }
    });
    
    if (existingSession) {
      // Check if actually abandoned
      const lastActivity = existingSession.updatedAt;
      const isStale = differenceInSeconds(new Date(), lastActivity) > 60;
      
      if (isStale) {
        // Auto-complete stale session
        await completeSession(existingSession.id, 'abandoned');
      } else {
        return {
          error: 'session_exists',
          message: 'You already have an active quiz for this artist',
          existingSessionId: existingSession.id,
          options: ['Continue on this device', 'Abandon other session']
        };
      }
    }
    
    return createNewSession(userId, artistId);
  }
}
```

---

## Question Generation Edge Cases

### 19. AI Generation Failures

**Problem:** AI fails to generate valid questions

```typescript
async function generateQuestions(artistId: string, count: number): Promise<QuizQuestion[]> {
  try {
    const questions = await aiGenerateQuestions(artistId, count);
    
    if (questions.length < count) {
      // Supplement with cached questions
      const cached = await getCachedQuestions(artistId, count - questions.length);
      return [...questions, ...cached];
    }
    
    return questions;
  } catch (error) {
    console.error('AI generation failed:', error);
    
    // Full fallback to cached questions
    const cached = await getCachedQuestions(artistId, count);
    
    if (cached.length < count) {
      return {
        error: 'insufficient_questions',
        message: 'Not enough questions available. Try another artist.',
        available: cached.length,
        required: count
      };
    }
    
    return cached;
  }
}
```

### 20. Question Already Seen Recently

**Problem:** User sees same question twice in short period

```typescript
interface QuestionCooldown {
  // Track questions seen by user
  QUESTION_COOLDOWN_HOURS: 24;
  
  async getQuestionsForSession(userId: string, artistId: string, count: number) {
    // Get recently seen questions
    const recentlySeenIds = await db.quizAnswer.findMany({
      where: {
        session: { userId },
        question: { artistId },
        answeredAt: { gte: subHours(new Date(), 24) }
      },
      select: { questionId: true }
    });
    
    const excludeIds = recentlySeenIds.map(r => r.questionId);
    
    // Fetch questions excluding recent ones
    const questions = await db.quizQuestion.findMany({
      where: {
        artistId,
        id: { notIn: excludeIds },
        isActive: true
      },
      take: count,
      orderBy: { usageCount: 'asc' } // Prefer less-used questions
    });
    
    if (questions.length < count) {
      // Need to reuse some questions - pick oldest seen
      const additionalNeeded = count - questions.length;
      const oldestSeen = await getOldestSeenQuestions(userId, artistId, additionalNeeded);
      return [...questions, ...oldestSeen];
    }
    
    return questions;
  }
}
```

---

## Summary: Critical Edge Cases Priority

| Priority | Edge Case | Impact | Mitigation |
|----------|-----------|--------|------------|
| 🔴 Critical | Network latency timing | Score accuracy | Client timestamp + grace period |
| 🔴 Critical | Powerup race conditions | Data corruption | Transaction locks |
| 🔴 Critical | Session recovery | User frustration | 30-second recovery window |
| 🟡 High | Tie-breaking | Fairness | Multi-factor tiebreaker |
| 🟡 High | Time penalty underflow | Exploit | Floor at 0 |
| 🟡 High | Anti-cheat detection | Leaderboard integrity | Pattern analysis |
| 🟢 Medium | Country changes | Manipulation | 30-day lock |
| 🟢 Medium | Question repetition | User experience | 24-hour cooldown |
| 🟢 Medium | 50/50 on True/False | UX confusion | Automatic refund |
