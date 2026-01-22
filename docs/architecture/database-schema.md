# Database Schema

**Purpose:** Complete Prisma schema with all models and relationships

---

## Complete Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid())
  spotifyId     String   @unique
  username      String   @unique
  displayName   String?
  email         String   @unique
  imageUrl      String?
  isPublic      Boolean  @default(true)
  profileReadme String?  @db.Text
  timezone      String   @default("UTC")
  createdAt     DateTime @default(now())
  lastSyncAt    DateTime?

  topArtists      UserTopArtist[]
  topTracks       UserTopTrack[]
  dailyListening  DailyListening[]
  personality     MusicPersonality?

  @@map("users")
}

model UserTopArtist {
  id         String   @id @default(uuid())
  userId     String
  spotifyId  String
  name       String
  imageUrl   String?
  genres     String[]
  popularity Int      @default(0)
  rank       Int
  timeRange  String   // 'short_term' | 'medium_term' | 'long_term'
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, spotifyId, timeRange])
  @@index([userId, timeRange, rank])
  @@map("user_top_artists")
}

model UserTopTrack {
  id         String   @id @default(uuid())
  userId     String
  spotifyId  String
  name       String
  artistName String
  albumName  String
  imageUrl   String?
  previewUrl String?
  rank       Int
  timeRange  String   // 'short_term' | 'medium_term' | 'long_term'
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, spotifyId, timeRange])
  @@index([userId, timeRange, rank])
  @@map("user_top_tracks")
}

model DailyListening {
  id            String   @id @default(uuid())
  userId        String
  date          String   // YYYY-MM-DD format
  minutes       Int      @default(0)
  topArtistId   String?
  topArtistName String?
  topTrackId    String?
  topTrackName  String?
  trackCount    Int      @default(0)
  createdAt     DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
  @@map("daily_listening")
}

model MusicPersonality {
  userId         String   @id
  tags           String[] // ['Explorer', 'Mainstream', etc.]
  genreDiversity Float    @default(0) // 0-1
  repeatRate     Float    @default(0) // 0-1
  uniqueArtists  Int      @default(0)
  longestStreak  Int      @default(0)
  currentStreak  Int      @default(0)
  streakArtist   String?
  computedAt     DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("music_personality")
}
```

---

## Model Descriptions

### User
**Purpose:** Core user account data  
**Key Fields:**
- `spotifyId`: Spotify user ID (unique)
- `username`: Public username for profile URL
- `isPublic`: Privacy toggle
- `timezone`: For date localization

**Relationships:**
- One-to-many with TopArtists, TopTracks, DailyListening
- One-to-one with MusicPersonality

---

### UserTopArtist
**Purpose:** Store user's top artists for different time ranges  
**Key Fields:**
- `timeRange`: short_term (4 weeks), medium_term (6 months), long_term (all time)
- `rank`: 1-50 ranking
- `genres`: Array of genre strings

**Constraints:**
- Unique combination of userId + spotifyId + timeRange
- Cascade delete when user deleted

---

### UserTopTrack
**Purpose:** Store user's top tracks for different time ranges  
**Key Fields:**
- `timeRange`: Same as artists
- `rank`: 1-50 ranking
- `previewUrl`: 30-second preview (may be null)

**Constraints:**
- Unique combination of userId + spotifyId + timeRange
- Cascade delete when user deleted

---

### DailyListening
**Purpose:** Aggregate daily listening activity  
**Key Fields:**
- `date`: YYYY-MM-DD string (not timestamp)
- `minutes`: Total listening minutes that day
- `topArtistId/topTrackId`: Most played that day

**Constraints:**
- Unique combination of userId + date (prevents duplicates)
- Cascade delete when user deleted

**Why string date?**
- Avoids timezone conversion issues
- Easier to query by date range
- Consistent with user's local timezone

---

### MusicPersonality
**Purpose:** Store computed personality metrics  
**Key Fields:**
- `tags`: Array of personality labels
- `genreDiversity`: Shannon entropy (0-1)
- `repeatRate`: Track repeat frequency (0-1)
- `longestStreak`: Artist loyalty record

**Constraints:**
- One-to-one with User
- Cascade delete when user deleted

---

## Indexes

### Performance Indexes

```prisma
@@index([userId, timeRange, rank]) // Fast top artist/track lookups
@@index([userId, date])             // Fast daily listening queries
```

### Why These Indexes?

**UserTopArtist/UserTopTrack:**
- Query pattern: Get top artists for user X in time range Y
- Sort by rank frequently

**DailyListening:**
- Query pattern: Get listening history for user X between dates Y and Z
- Date range queries common

---

## Migration Commands

### Create Migration

```bash
npx prisma migrate dev --name add_personality_model
```

### Apply Migration (Production)

```bash
npx prisma migrate deploy
```

### Reset Database (Development)

```bash
npx prisma migrate reset
```

### Generate Prisma Client

```bash
npx prisma generate
```

---

## Sample Queries

### Create User

```typescript
await db.user.create({
  data: {
    spotifyId: 'spotify_user_id',
    username: 'john_doe',
    email: 'john@example.com',
    displayName: 'John Doe',
    imageUrl: 'https://...'
  }
});
```

### Upsert Daily Listening

```typescript
await db.dailyListening.upsert({
  where: {
    userId_date: {
      userId: 'user-id',
      date: '2024-01-22'
    }
  },
  update: {
    minutes: 120,
    topArtistId: 'artist-id'
  },
  create: {
    userId: 'user-id',
    date: '2024-01-22',
    minutes: 120,
    topArtistId: 'artist-id'
  }
});
```

### Get Top Artists

```typescript
const artists = await db.userTopArtist.findMany({
  where: {
    userId: 'user-id',
    timeRange: 'short_term'
  },
  orderBy: {
    rank: 'asc'
  },
  take: 20
});
```

### Get Listening History

```typescript
const history = await db.dailyListening.findMany({
  where: {
    userId: 'user-id',
    date: {
      gte: '2024-01-01',
      lte: '2024-12-31'
    }
  },
  orderBy: {
    date: 'asc'
  }
});
```

---

## Data Types

### Prisma to TypeScript

```
String   → string
Int      → number
Float    → number
Boolean  → boolean
DateTime → Date
String[] → string[]
```

### Database to Prisma

```
varchar      → String
text         → String @db.Text
integer      → Int
decimal      → Float
boolean      → Boolean
timestamp    → DateTime
varchar[]    → String[]
```

---

**Last Updated:** January 22, 2026
