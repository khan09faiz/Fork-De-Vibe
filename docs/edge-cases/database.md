# Database Edge Cases

**Purpose:** Handle database constraints, conflicts, and integrity issues

---

## 1. Duplicate Daily Entries

**Problem:**
- Cron job may run twice (server restart, deployment)
- Manual sync and auto sync overlap
- Results in duplicate DailyListening rows

**Impact:**
- Incorrect total minutes
- Skewed personality metrics
- Broken listening graph

**Mitigation:**

```prisma
model DailyListening {
  userId String
  date   String
  
  @@unique([userId, date])
}
```

```typescript
await db.dailyListening.upsert({
  where: {
    userId_date: { userId, date }
  },
  update: {
    minutes: newMinutes,
    topTrackId: newTopTrackId
  },
  create: {
    userId,
    date,
    minutes: newMinutes,
    topTrackId: newTopTrackId
  }
});
```

**Critical Rule:**
- Always use upsert for daily data
- Never use create without checking existence

---

## 2. Username Collisions

**Problem:**
- Two users want same username
- Auto-generation from Spotify name may conflict

**Impact:**
- User registration fails
- Database constraint violation

**Mitigation:**

```typescript
async function generateUsername(displayName: string): Promise<string> {
  let username = displayName.toLowerCase().replace(/\s+/g, '_');
  username = username.replace(/[^a-z0-9_]/g, '');
  
  let attempt = username;
  let suffix = 1;
  
  while (await db.user.findUnique({ where: { username: attempt } })) {
    attempt = `${username}_${suffix}`;
    suffix++;
    
    if (suffix > 100) {
      attempt = `${username}_${Date.now()}`;
      break;
    }
  }
  
  return attempt;
}
```

```prisma
model User {
  username String @unique
}
```

**Fallback Examples:**
- `faiz` → `faiz_2`
- `john_smith` → `john_smith_3`
- Extreme case → `faiz_1674567890`

---

## 3. Orphaned Records

**Problem:**
- User deletes account
- Related records remain in database

**Impact:**
- Database bloat
- Privacy violation (GDPR concern)

**Mitigation:**

```prisma
model DailyListening {
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserTopArtist {
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserTopTrack {
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model MusicPersonality {
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Critical Rule:**
- All user-related tables must have onDelete: Cascade

---

## 4. Connection Pooling

**Problem:**
- Too many database connections
- Connection timeouts
- Serverless function cold starts

**Impact:**
- Database errors
- Slow performance
- Function failures

**Mitigation:**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

**Environment Variables:**

```
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1"
```

---

## 5. Migration Failures

**Problem:**
- Schema changes fail in production
- Data loss during migration
- Downtime during deployment

**Impact:**
- App breaks
- Data becomes inaccessible

**Mitigation:**

```bash
# Test migrations locally first
npx prisma migrate dev --name test_migration

# Check migration SQL
cat prisma/migrations/*/migration.sql

# Deploy with backup
pg_dump $DATABASE_URL > backup.sql
npx prisma migrate deploy
```

**Safe Migration Practices:**
- Always create backups before migration
- Test on staging database first
- Use additive changes (add columns, not drop)
- Never delete data in migration

---

## 6. Constraint Violations

**Problem:**
- Unique constraint violations
- Foreign key violations
- Null constraint violations

**Impact:**
- Database errors
- Failed operations
- Data inconsistency

**Mitigation:**

```typescript
try {
  await db.user.create({
    data: { username, email, spotifyId }
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { error: 'Username or email already exists' };
    }
    if (error.code === 'P2003') {
      return { error: 'Invalid reference' };
    }
  }
  throw error;
}
```

**Common Error Codes:**
- P2002: Unique constraint violation
- P2003: Foreign key constraint violation
- P2025: Record not found

---

## Testing Checklist

- [ ] Duplicate entry handling tested
- [ ] Username collision handling works
- [ ] Cascade deletes working
- [ ] Connection pooling configured
- [ ] Migrations tested on staging
- [ ] Constraint violations handled

**Last Updated:** January 22, 2026
