# Architecture Overview

**Purpose:** High-level system architecture and design principles

---

## System Architecture

TuneHub is a full-stack web application built with Next.js 14, following a serverless architecture pattern deployed on Vercel.

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  (Next.js App Router, React Server Components, TailwindCSS) │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                      │
│          (API Routes, Server Actions, Middleware)        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────┬──────────────────────────────────┐
│   External Services  │      Data Layer                  │
│  (Spotify Web API)   │  (PostgreSQL + Prisma ORM)       │
└──────────────────────┴──────────────────────────────────┘
```

---

## Core Principles

### 1. Server-First Architecture
- Leverage React Server Components for data fetching
- Minimize client-side JavaScript
- Server-side authentication and authorization

### 2. ISR Caching Strategy
- Static generation with Incremental Static Regeneration
- Revalidate profile pages every hour
- Cache Spotify API responses aggressively

### 3. Serverless Functions
- All API routes run as Vercel serverless functions
- Stateless request handling
- Connection pooling for database

### 4. Security by Design
- All Spotify tokens server-side only
- Input sanitization with DOMPurify
- CSRF protection via NextAuth.js
- Parameterized database queries

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Components:** React Server Components + Client Components
- **Charts:** Recharts for listening graph

### Backend
- **API:** Next.js API Routes
- **Authentication:** NextAuth.js v4 with Spotify Provider
- **External API:** Spotify Web API (OAuth 2.0)

### Database
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Hosting:** Supabase / Railway (free tier)

### Deployment
- **Hosting:** Vercel
- **CI/CD:** GitHub integration (automatic deployment)
- **Cron Jobs:** Vercel Cron for data sync

---

## Key Design Decisions

### Why Next.js App Router?
- Server Components reduce client bundle size
- Built-in ISR for profile caching
- API routes for serverless functions
- Middleware for auth protection

### Why PostgreSQL + Prisma?
- Relational data model fits user/music relationships
- Prisma provides type-safe database access
- Strong consistency for user data
- Connection pooling for serverless

### Why NextAuth.js?
- Built-in Spotify provider
- Token refresh handling
- Session management
- CSRF protection

---

## Data Flow Patterns

### Profile Page Load
```
User visits /{username}
  ↓
Next.js checks ISR cache (1 hour TTL)
  ↓
If expired: Fetch from PostgreSQL
  ↓
Render Server Component
  ↓
Send HTML to client
```

### Data Sync Flow
```
User clicks "Sync"
  ↓
API checks last sync time (rate limit: 1 hour)
  ↓
Fetch recently-played from Spotify
  ↓
Aggregate by date in user's timezone
  ↓
Upsert to daily_listening table
  ↓
Compute personality metrics
  ↓
Return success + revalidate profile cache
```

---

## Scalability Considerations

### Current Architecture (Free Tier)
- Handles ~1000 users
- Rate limited by Spotify API (not database)
- ISR caching reduces database load

### Bottlenecks
1. Spotify API rate limits (10 req/sec per user)
2. Serverless function cold starts
3. Database connection limits (Supabase: 60 connections)

### Future Optimizations
- Add Redis for session caching
- Implement background job queue for sync
- Use CDN for static assets
- Add database read replicas

---

## Security Model

### Authentication Flow
1. User clicks "Sign in with Spotify"
2. OAuth redirect to Spotify
3. Spotify returns auth code
4. Exchange for access + refresh tokens
5. Store in encrypted JWT session
6. Set secure HTTP-only cookie

### Authorization
- Profile visibility: public/private toggle
- Owner check for all mutations
- Session validation on every API call

### Data Protection
- No tokens sent to client
- XSS prevention with DOMPurify
- SQL injection prevented by Prisma
- HTTPS only in production

---

## Development Workflow

### Local Development
```bash
npm run dev          # Start development server
npx prisma studio    # Open database GUI
npx prisma migrate dev  # Run migrations
```

### Testing
```bash
npm run build        # Test production build
npm run lint         # Check code quality
```

### Deployment
```bash
git push origin main  # Auto-deploys to Vercel
```

---

**Last Updated:** January 22, 2026
