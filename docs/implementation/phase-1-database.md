# Phase 1: Database Setup

**Duration:** 2 hours  
**Prerequisites:** Phase 0 complete, PostgreSQL installed

## Goals

- Set up local PostgreSQL database
- Initialize Prisma
- Define complete schema
- Run initial migration
- Test database connection

## Step 1: Install PostgreSQL

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Windows
Download installer from https://www.postgresql.org/download/windows/

### Linux (Ubuntu)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Step 2: Create Database

```bash
# Access PostgreSQL
psql postgres

# Create database
CREATE DATABASE tunehub_dev;

# Create user (optional)
CREATE USER tunehub WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tunehub_dev TO tunehub;

# Exit
\q
```

Update `.env.local`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/tunehub_dev"
```

## Step 3: Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma`
- `.env` (delete this, use `.env.local` instead)

## Step 4: Define Schema

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(cuid())
  spotifyId     String   @unique @map("spotify_id")
  email         String   @unique
  username      String   @unique
  displayName   String?  @map("display_name")
  imageUrl      String?  @map("image_url")
  isPublic      Boolean  @default(true) @map("is_public")
  profileReadme String?  @db.Text @map("profile_readme")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  listeningHistory DailyListening[]
  topArtists       UserTopArtist[]
  topTracks        UserTopTrack[]
  personality      MusicPersonality?
  followers        Follow[]          @relation("UserFollowers")
  following        Follow[]          @relation("UserFollowing")

  @@index([username])
  @@index([spotifyId])
  @@map("users")
}

model DailyListening {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  date        String
  minutes     Int
  topTrackId  String?  @map("top_track_id")
  topArtistId String?  @map("top_artist_id")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
  @@map("daily_listening")
}

model UserTopArtist {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  spotifyId  String   @map("spotify_id")
  name       String
  genres     String[]
  imageUrl   String?  @map("image_url")
  popularity Int
  timeRange  String   @map("time_range")
  rank       Int
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, timeRange, rank])
  @@index([userId, timeRange])
  @@map("user_top_artists")
}

model UserTopTrack {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  spotifyId   String   @map("spotify_id")
  name        String
  artistName  String   @map("artist_name")
  albumName   String   @map("album_name")
  imageUrl    String?  @map("image_url")
  previewUrl  String?  @map("preview_url")
  timeRange   String   @map("time_range")
  rank        Int
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, timeRange, rank])
  @@index([userId, timeRange])
  @@map("user_top_tracks")
}

model MusicPersonality {
  id             String   @id @default(cuid())
  userId         String   @unique @map("user_id")
  tags           String[]
  genreDiversity Float    @map("genre_diversity")
  repeatRate     Float    @map("repeat_rate")
  uniqueArtists  Int      @map("unique_artists")
  longestStreak  Int      @map("longest_streak")
  currentStreak  Int      @map("current_streak")
  streakArtist   String?  @map("streak_artist")
  computedAt     DateTime @default(now()) @map("computed_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("music_personality")
}

model Follow {
  followerId  String   @map("follower_id")
  followingId String   @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  follower  User @relation("UserFollowers", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("UserFollowing", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@map("follows")
}
```

## Step 5: Create Migration

```bash
npx prisma migrate dev --name initial_schema
```

This will:
1. Generate SQL migration file
2. Execute migration against database
3. Generate Prisma Client

## Step 6: Create Database Client

Create `lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

## Step 7: Test Database Connection

Create `lib/utils/test-db.ts`:

```typescript
import { db } from '@/lib/db';

export async function testDatabaseConnection() {
  try {
    await db.$connect();
    console.log('Database connected successfully');
    
    const userCount = await db.user.count();
    console.log(`Current user count: ${userCount}`);
    
    await db.$disconnect();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
```

Run test:

```bash
npx ts-node -r tsconfig-paths/register lib/utils/test-db.ts
```

## Step 8: Prisma Studio

View database in GUI:

```bash
npx prisma studio
```

Opens at http://localhost:5555

## Step 9: Add Seed Data (Optional)

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const testUser = await prisma.user.create({
    data: {
      spotifyId: 'test_user_123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      imageUrl: 'https://via.placeholder.com/150',
      isPublic: true
    }
  });

  console.log('Created test user:', testUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Update `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run seed:

```bash
npx prisma db seed
```

## Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] Prisma initialized
- [ ] Schema defined
- [ ] Migration successful
- [ ] Prisma Client generated
- [ ] Database connection tested
- [ ] Prisma Studio accessible

## Common Issues

**Issue:** Database connection refused
**Solution:** Check PostgreSQL is running: `brew services list` or `systemctl status postgresql`

**Issue:** Migration fails
**Solution:** Drop database and recreate: `dropdb tunehub_dev && createdb tunehub_dev`

**Issue:** Prisma Client not found
**Solution:** Run `npx prisma generate`

**Issue:** ts-node error
**Solution:** Install: `npm install -D ts-node tsconfig-paths`

## Next Phase

Continue to [Phase 2: Authentication](phase-2-auth.md)

**Last Updated:** January 22, 2026
