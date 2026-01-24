# TuneHub v2.0 - New Features Overview

**Version:** 2.0  
**Last Updated:** January 24, 2026

---

## 🎮 Feature 1: Artist Quiz & Leaderboard System

### Core Functionality
Transform your music knowledge into a competitive game! Test how well you know your favorite artists with AI-generated quizzes, compete on monthly leaderboards, and earn badges for your achievements.

### Key Features

#### Quiz Engine
- **AI-Generated Questions**: Unique questions about artist history, albums, lyrics, collaborations, and trivia
- **Multiple Difficulty Levels**: Easy, Medium, Hard, Expert
- **Question Types**: Multiple choice, True/False, Year guessing, Lyric completion
- **Never Repeat**: Questions randomized per session, cooldown system prevents recent repeats

#### Game Modes
| Mode | Description | For Users Who... |
|------|-------------|------------------|
| **Standard** | Answer at your own pace | Want to learn |
| **Timed Challenge** | Race against the clock | Love pressure |
| **Sudden Death** | One wrong = game over | Want extreme challenge |
| **Practice** | No pressure, no leaderboard | Want to practice |

#### Leaderboard System
- **Monthly Reset**: Fresh competition every month
- **Multiple Boards**: Global, Per-Artist, Friends-only
- **Tier Rankings**: Bronze → Silver → Gold → Platinum → Diamond → Legend
- **Historical Archives**: Past winners preserved

#### Badge & Achievement System
- **50+ Badges** across categories
- **Progressive Unlocks**: Track progress toward badges
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary
- **Artist-Specific Badges**: Become a certified superfan

### UX Micro-Features
- ✨ Confetti animation on correct answers
- 🔥 Streak flames at 3+ consecutive correct
- ⏱️ Pulsing timer with sound effects
- 💡 Hint system (50/50, skip, extra time)
- 📊 Detailed results breakdown
- 🏆 Real-time leaderboard position
- 🎨 Share cards for social media

---

## 🎸 Feature 2: Concert Discovery System

### Core Functionality
Never miss a concert by your favorite artists! Discover upcoming shows based on your location, get notified about new announcements, and plan concert experiences with friends.

### Key Features

#### Location-Based Search
- **Country/Region/City Selection**: Precise location targeting
- **Radius Search**: Find concerts within your travel distance
- **Cross-Border Discovery**: Find shows in nearby countries

#### Concert Data Aggregation
- **Multi-Source Scraping**: Bandsintown, Songkick, Ticketmaster, Google Events
- **Real-Time Updates**: Data refreshed every 6 hours
- **Deduplication**: Smart matching prevents duplicate listings
- **Validation**: Cross-reference to ensure accuracy

#### User Interactions
| Action | Description |
|--------|-------------|
| **Interested** | Save for later, get updates |
| **Going** | Commit to attending |
| **Reminder** | Get notified before event |
| **Share** | Tell friends about the show |

#### Ticket Intelligence
- **Price Ranges**: See min/max ticket prices
- **Multiple Sources**: Compare official vs resale prices
- **Status Tracking**: On sale, Presale, Sold out, Cancelled
- **Direct Links**: One-click to purchase

### UX Micro-Features
- 🗓️ Calendar view with concert dates
- 🗺️ Map view with venue markers
- 📍 Distance badges (5km, 20km, 100km)
- 👥 Friends attending indicators
- ⏰ Countdown to event
- 🔔 Smart notification preferences
- 📱 Add to phone calendar export

---

## 🔗 Feature Interconnections

### How Features Connect

```
┌─────────────────────────────────────────────────────────────┐
│                       USER PROFILE                          │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────┐ │
│  │ Top     │  │ Quiz     │  │ Concert   │  │ Badges &    │ │
│  │ Artists │  │ Stats    │  │ Plans     │  │ Achievements│ │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └──────┬──────┘ │
└───────┼────────────┼──────────────┼───────────────┼────────┘
        │            │              │               │
        ▼            ▼              ▼               ▼
   ┌─────────────────────────────────────────────────────────┐
   │                   INTEGRATION LAYER                      │
   ├─────────────────────────────────────────────────────────┤
   │  • Quiz suggestions based on top artists                │
   │  • Concert alerts for favorite artists                  │
   │  • Badges earned from quiz & concert attendance         │
   │  • Personality tags influenced by quiz mastery          │
   │  • XP bonuses for concert check-ins                     │
   └─────────────────────────────────────────────────────────┘
```

### Integration Points

| From | To | Connection |
|------|-----|------------|
| Top Artists | Quiz | Auto-suggest quizzes for favorites |
| Top Artists | Concerts | Priority alerts for top artist shows |
| Quiz Score | Personality | "Music Expert" tag for high scorers |
| Quiz | Profile | Display badges and stats publicly |
| Concert | Profile | Show upcoming concerts on profile |
| Concert | Quiz | Bonus XP for attending live shows |
| Badges | Profile | Badge showcase section |
| Leaderboard | Profile | Show ranking badge |

---

## 📱 User Journey Examples

### Journey 1: Quiz Enthusiast
1. User logs in, sees "Quiz Challenge" card featuring their #1 artist
2. Starts a 10-question Hard mode quiz
3. Gets 8/10 correct, unlocks "Deep Knowledge" badge
4. Climbs to #47 on monthly leaderboard
5. Shares result card to Twitter
6. Returns next day to maintain daily streak

### Journey 2: Concert Hunter
1. User sets location to "New York, NY"
2. Sees 12 upcoming concerts for their top artists
3. Marks "Interested" in Taylor Swift show
4. Gets notification when presale starts
5. Invites friend through app
6. Both marked as "Going", visible on profiles

### Journey 3: Completionist
1. User reviews badge progress on profile
2. Sees "3 more perfect quizzes needed for Perfectionist badge"
3. Completes 3 perfect quizzes over the week
4. Badge unlocks with celebratory animation
5. Badge displayed prominently on profile
6. Shares achievement to social media

---

## 🛠️ Technical Requirements

### New Environment Variables
```env
# Quiz System (ALL FREE)
LASTFM_API_KEY=your-lastfm-api-key          # Free at last.fm/api
MUSICBRAINZ_USER_AGENT=TuneHub/1.0          # Required for MusicBrainz

# Concert Discovery (ALL FREE)
BANDSINTOWN_APP_ID=your-app-id              # Free at artists.bandsintown.com
SONGKICK_API_KEY=your-songkick-key          # Free tier available
```

### New Dependencies
```json
{
  "puppeteer": "^22.x",
  "cheerio": "^1.x",
  "date-fns": "^3.x",
  "framer-motion": "^10.x"
}
```
```

### New Database Tables
- `quiz_questions` - AI-generated questions cache
- `quiz_sessions` - Active and completed quiz sessions
- `quiz_answers` - User answers per session
- `user_quiz_stats` - XP, level, streaks
- `badges` - Earned badges
- `leaderboards` - Leaderboard definitions
- `leaderboard_entries` - User rankings
- `concerts` - Concert data
- `venues` - Venue information
- `ticket_sources` - Ticket vendor links
- `user_locations` - User location preferences
- `user_concert_interactions` - Interested/Going status
- `concert_reminders` - Scheduled notifications
- `scraping_jobs` - Web scraping job tracking

### Cron Jobs
| Job | Schedule | Purpose |
|-----|----------|---------|
| Leaderboard Reset | 1st of month | Archive and reset monthly boards |
| Concert Scraping | Every 6 hours | Refresh concert data |
| Reminder Dispatch | Every hour | Send due reminders |
| Stale Data Cleanup | Daily | Remove past events |

---

## 📊 Success Metrics

### Quiz System
- Quiz sessions started per user per month
- Average quiz completion rate
- Badge earn rate
- Leaderboard engagement (returns to check position)
- Social shares of quiz results

### Concert Discovery
- Concerts viewed per user
- "Interested" / "Going" conversion rate
- Notification engagement rate
- Ticket link click-through rate
- Friend invites sent

---

## 🚀 Getting Started

1. Read [Phase 9: Quiz Implementation](implementation/phase-9-quiz.md)
2. Read [Phase 10: Concert Implementation](implementation/phase-10-concerts.md)
3. Review [Quiz Edge Cases](edge-cases/quiz.md)
4. Review [Concert Edge Cases](edge-cases/concerts.md)
5. Check [UI Data Structures](ui-data-structures.md) for TypeScript types

---

**Questions?** Review the feature documentation or edge cases for detailed specifications.
