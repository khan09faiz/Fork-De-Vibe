# Setup Complete - Verification Checklist

**Date:** _______________  
**Developer:** _______________

---

## ✅ PHASE 0: PROJECT SETUP

### Environment
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm/pnpm installed (`npm --version`)
- [ ] Git initialized (`git status`)
- [ ] Code editor setup (VS Code + extensions)

### Project Structure
- [ ] Next.js project created
- [ ] All dependencies installed (`npm install` succeeded)
- [ ] Folder structure created (`app/`, `components/`, `lib/`, `prisma/`, etc.)
- [ ] TypeScript configured (strict mode enabled)
- [ ] Tailwind CSS configured (custom colors added)
- [ ] ESLint configured

### Environment Variables
- [ ] `.env.local` file created
- [ ] `.env.example` file created (no secrets)
- [ ] `SPOTIFY_CLIENT_ID` set
- [ ] `SPOTIFY_CLIENT_SECRET` set
- [ ] `DATABASE_URL` set
- [ ] `NEXTAUTH_URL` set (http://localhost:3000)
- [ ] `NEXTAUTH_SECRET` generated and set

### Spotify App Registration
- [ ] Spotify Developer account created
- [ ] App registered on Spotify Dashboard
- [ ] Redirect URI configured: `http://localhost:3000/api/auth/callback/spotify`
- [ ] Client ID and Secret copied to `.env.local`
- [ ] Required scopes documented

### Git Repository
- [ ] Git repository initialized
- [ ] `.gitignore` file present
- [ ] `.env.local` in `.gitignore`
- [ ] Initial commit made
- [ ] (Optional) Remote repository connected

---

## ✅ PHASE 1: DATABASE & SCHEMA

### Database Setup
- [ ] PostgreSQL database created (local or Supabase)
- [ ] Database connection string added to `.env.local`
- [ ] Database accessible (no connection errors)

### Prisma Configuration
- [ ] Prisma initialized (`npx prisma init`)
- [ ] `schema.prisma` file created
- [ ] Database schema defined (all models added)
- [ ] Prisma Client generated (`npx prisma generate`)
- [ ] Initial migration created (`npx prisma migrate dev --name init`)
- [ ] Migration applied successfully

### Database Verification
- [ ] Can connect to database
- [ ] All tables created (check Prisma Studio)
- [ ] Database client helper created (`lib/db.ts`)
- [ ] Connection test passes (`tests/db-test.ts`)

### Schema Models Present
- [ ] User model
- [ ] DailyListening model
- [ ] UserTopArtist model
- [ ] UserTopTrack model
- [ ] MusicPersonality model
- [ ] Follow model (for Phase 2 features)
- [ ] All foreign key relationships defined
- [ ] Unique constraints added
- [ ] Indexes created

---

## ✅ PHASE 2: AUTHENTICATION

### NextAuth Setup
- [ ] NextAuth installed
- [ ] `pages/api/auth/[...nextauth].ts` created
- [ ] Spotify provider configured
- [ ] OAuth scopes defined
- [ ] JWT callback implemented (with token refresh)
- [ ] Session callback implemented
- [ ] TypeScript types defined (`types/next-auth.d.ts`)

### Auth Pages
- [ ] Sign-in page created (`app/auth/signin/page.tsx`)
- [ ] Sign-in button renders
- [ ] OAuth flow redirects to Spotify
- [ ] User can authorize app
- [ ] Redirects back to app after auth

### Session Management
- [ ] SessionProvider added to root layout
- [ ] Session persists across page reloads
- [ ] Auth helper utilities created (`lib/auth.ts`)
- [ ] `getServerSession()` helper works
- [ ] `requireAuth()` helper works

### Auth Testing
- [ ] Can sign in with Spotify
- [ ] User record created in database
- [ ] Session data includes user ID, Spotify ID, access token
- [ ] Can sign out
- [ ] Protected routes block unauthenticated users

---

## ✅ PHASE 3: SPOTIFY API INTEGRATION

### API Client
- [ ] Spotify types defined (`types/spotify.ts`)
- [ ] Spotify API client created (`lib/spotify/client.ts`)
- [ ] Error handling implemented
- [ ] 401 errors handled (token expiry)

### Data Fetchers
- [ ] Top artists fetcher implemented (`lib/spotify/fetchTopArtists.ts`)
- [ ] Top tracks fetcher implemented (`lib/spotify/fetchTopTracks.ts`)
- [ ] Recently played fetcher implemented (`lib/spotify/fetchRecentlyPlayed.ts`)

### API Routes
- [ ] `/api/spotify/top-artists` route created
- [ ] `/api/spotify/top-tracks` route created
- [ ] `/api/spotify/recently-played` route created
- [ ] All routes require authentication
- [ ] All routes handle errors gracefully

### API Testing
- [ ] Top artists endpoint returns data
- [ ] Top tracks endpoint returns data
- [ ] Recently played endpoint returns data
- [ ] Empty responses handled correctly
- [ ] Invalid tokens handled (401 errors)

---

## ✅ PHASE 4: DATA AGGREGATION & CACHING

### Utility Functions
- [ ] Date utilities created (`utils/normalizeDates.ts`)
- [ ] Listening aggregation logic implemented (`utils/aggregateListening.ts`)
- [ ] Timezone handling correct

### Sync API
- [ ] `/api/spotify/sync-history` route created
- [ ] Fetches recently played tracks
- [ ] Aggregates to daily listening data
- [ ] Stores in database (upsert)
- [ ] Rate limiting implemented (1 sync per hour)

### Testing
- [ ] Sync endpoint works
- [ ] Daily listening data saved to database
- [ ] Duplicate entries prevented (unique constraint)
- [ ] Timezone conversion correct

---

## ✅ FINAL VERIFICATION

### Development Server
- [ ] `npm run dev` runs without errors
- [ ] Can access http://localhost:3000
- [ ] No console errors in browser
- [ ] No TypeScript errors (`npm run type-check`)

### Database
- [ ] Prisma Studio opens (`npx prisma studio`)
- [ ] Can see users table
- [ ] Can see listening data after sync

### Authentication Flow
- [ ] Sign in → Spotify OAuth → Redirect back
- [ ] Session persists
- [ ] Can access protected routes
- [ ] Sign out works

### API Endpoints
- [ ] `/api/spotify/top-artists` works
- [ ] `/api/spotify/top-tracks` works
- [ ] `/api/spotify/recently-played` works
- [ ] `/api/spotify/sync-history` works

---

## 🎯 READY FOR PHASE 5: UI DEVELOPMENT

If all checkboxes above are checked, you're ready to:
1. Build UI components
2. Create dashboard page
3. Implement public profile pages

**Next Steps:**
- Read [docs/design](design) for UI specifications
- Continue with Phase 5 in [docs/instructions](instructions)

---

## 🐛 ISSUES FOUND

Document any issues encountered during setup:

| Issue | Resolution | Date |
|-------|------------|------|
|       |            |      |
|       |            |      |
|       |            |      |

---

## 📝 NOTES

Additional setup notes:

```
(Add any custom configuration, deviations from docs, or important notes here)
```

---

**Setup Completed By:** _______________  
**Date:** _______________  
**Time Taken:** _______________  
**Status:** [ ] Complete [ ] Partial [ ] Issues

---

**Last Updated:** January 22, 2026
