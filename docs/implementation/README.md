# Implementation Phases

This directory contains step-by-step implementation guides for building TuneHub.

## Phase Overview

### Core Features
| Phase | Focus | Duration | Files |
|-------|-------|----------|-------|
| [Phase 0](phase-0-setup.md) | Project setup | 1 hour | Setup Next.js, dependencies |
| [Phase 1](phase-1-database.md) | Database | 2 hours | Prisma schema, migrations |
| [Phase 2](phase-2-auth.md) | Authentication | 3 hours | NextAuth.js, Spotify OAuth |
| [Phase 3](phase-3-spotify-api.md) | Spotify API | 4 hours | API integration, token refresh |
| [Phase 4](phase-4-data-aggregation.md) | Data aggregation | 3 hours | Process listening data |
| [Phase 5](phase-5-profile-page.md) | Profile page | 4 hours | Build public profile |
| [Phase 6](phase-6-components.md) | UI components | 5 hours | All 9 components |
| [Phase 7](phase-7-calculations.md) | Calculations | 3 hours | Personality, loyalty |
| [Phase 8](phase-8-polish.md) | Polish & deploy | 2 hours | Testing, deployment |

### New Features (v2.0)
| Phase | Focus | Duration | Files |
|-------|-------|----------|-------|
| [Phase 9](phase-9-quiz.md) | **Quiz & Leaderboard** | 6-8 hours | AI questions, badges, rankings |
| [Phase 10](phase-10-concerts.md) | **Concert Discovery** | 8-10 hours | Scraping, search, notifications |

**Total estimated time:** 35-40 hours

## New Feature Dependencies

```
Phase 9 (Quiz) requires:
├── Phase 1 (Database) - For quiz tables
├── Phase 2 (Auth) - For user sessions
├── Phase 4 (Data Aggregation) - For top artists data
└── Free APIs: Last.fm + MusicBrainz (no paid services)

Phase 10 (Concerts) requires:
├── Phase 1 (Database) - For concert tables
├── Phase 2 (Auth) - For user preferences
├── Phase 4 (Data Aggregation) - For artist data
└── Free APIs: Bandsintown + Songkick + Puppeteer (no paid services)
```

## Reading Order

Follow the numeric order. Each phase builds on the previous one.

### Recommended Path for New Features:
1. Complete Phase 0-4 (Core infrastructure)
2. Phase 9 (Quiz) can be done in parallel with Phase 5-8
3. Phase 10 (Concerts) can be done after Quiz or in parallel

## Phase Structure

Each phase document includes:
- Goals and objectives
- Prerequisites
- Step-by-step instructions
- Code examples
- Testing checklist
- Common issues and solutions

## Quick Start

1. Complete [Phase 0](phase-0-setup.md) to set up your development environment
2. Work through phases sequentially
3. Test after each phase before moving forward
4. Reference architecture and design docs as needed

## Dependencies

- **Architecture:** [/docs/architecture/](../architecture/)
- **Design:** [/docs/design/](../design/)
- **Features:** [/docs/features/](../features/)
- **Edge Cases:** [/docs/edge-cases/](../edge-cases/)

## Environment Variables for New Features

Add these to your `.env.local`:

```env
# Quiz System (Phase 9) - ALL FREE APIs
LASTFM_API_KEY=your-lastfm-api-key          # Free at last.fm/api
MUSICBRAINZ_USER_AGENT=TuneHub/1.0          # Required for MusicBrainz

# Concert Discovery (Phase 10) - ALL FREE APIs  
BANDSINTOWN_APP_ID=your-app-id              # Free at artists.bandsintown.com
SONGKICK_API_KEY=your-songkick-key          # Free tier available
```
