# Feature: Authentication with Spotify

## User Story

As a user, I want to sign in with my Spotify account so that TuneHub can access my listening data.

## Overview

OAuth 2.0 authentication using NextAuth.js and Spotify provider. Users authorize specific scopes for data access.

## Required Scopes

```typescript
user-read-email user-read-private user-top-read user-read-recently-played
```

## Authentication Flow

1. User clicks "Sign in with Spotify"
2. Redirect to Spotify OAuth page
3. User authorizes scopes
4. Exchange code for tokens
5. Create/update user in database
6. Store session cookie
7. Redirect to dashboard

## Implementation Files

- `pages/api/auth/[...nextauth].ts` - NextAuth configuration
- `app/login/page.tsx` - Login page
- `middleware.ts` - Route protection

## Key Functions

### Token Refresh
Automatically refresh expired access tokens using refresh token.

### Session Management
Store encrypted session in httpOnly cookie, expires in 30 days.

## Acceptance Criteria

- User can sign in with one click
- Session persists across browser restarts
- Tokens refresh automatically when expired
- User can sign out
- Protected routes redirect to login

## Edge Cases

See [Edge Cases: Authentication](../edge-cases/spotify-api.md)

**Last Updated:** January 22, 2026
