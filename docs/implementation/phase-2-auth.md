# Phase 2: Authentication

**Duration:** 3 hours  
**Prerequisites:** Phase 0 and 1 complete, Spotify app registered

## Goals

- Configure NextAuth.js with Spotify provider
- Implement token refresh logic
- Create login page
- Set up session management
- Protect routes with middleware

## Step 1: NextAuth Configuration

Create `pages/api/auth/[...nextauth].ts`:

```typescript
import NextAuth, { NextAuthOptions } from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { db } from '@/lib/db';

const scopes = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'user-read-recently-played'
].join(' ');

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken
      })
    });

    const refreshedTokens = await response.json();

    if (!response.ok) throw refreshedTokens;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: { scope: scopes }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at! * 1000;
        token.spotifyId = account.providerAccountId;
      }

      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.accessToken = token.accessToken as string;
      session.error = token.error as string;
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'spotify') {
        // Fetch full user profile from Spotify to get country and other data
        let spotifyUserData = null;
        try {
          const response = await fetch('https://api.spotify.com/v1/me', {
            headers: {
              Authorization: `Bearer ${account.access_token}`
            }
          });
          if (response.ok) {
            spotifyUserData = await response.json();
          }
        } catch (error) {
          console.error('Error fetching Spotify user data:', error);
        }

        const existingUser = await db.user.findUnique({
          where: { spotifyId: account.providerAccountId }
        });

        if (!existingUser) {
          let username = user.name?.toLowerCase().replace(/\s+/g, '_') || 'user';
          let isUnique = false;
          let attempts = 0;

          while (!isUnique && attempts < 10) {
            const existing = await db.user.findUnique({ where: { username } });
            if (!existing) {
              isUnique = true;
            } else {
              username = `${username}_${Math.floor(Math.random() * 1000)}`;
              attempts++;
            }
          }

          await db.user.create({
            data: {
              spotifyId: account.providerAccountId,
              email: user.email!,
              username,
              displayName: user.name,
              imageUrl: user.image,
              country: spotifyUserData?.country || null, // ISO 3166-1 alpha-2 code from Spotify
              isPublic: true
            }
          });
        } else {
          // Update country if it's not set or if it changed
          if (spotifyUserData?.country && existingUser.country !== spotifyUserData.country) {
            await db.user.update({
              where: { id: existingUser.id },
              data: { country: spotifyUserData.country }
            });
          }
        }
      }
      return true;
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60
  }
};

export default NextAuth(authOptions);
```

## Step 2: Create Login Page

Create `app/login/page.tsx`:

```typescript
'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
      <div className="max-w-md w-full bg-bg-secondary rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">TuneHub</h1>
          <p className="text-text-secondary">Your music identity on the web</p>
        </div>

        <button
          onClick={() => signIn('spotify', { callbackUrl: '/dashboard' })}
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Sign in with Spotify
        </button>

        <p className="text-xs text-text-muted text-center mt-6">
          By signing in, you agree to share your Spotify listening data with TuneHub
        </p>
      </div>
    </div>
  );
}
```

## Step 3: Create Error Page

Create `app/auth/error/page.tsx`:

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You denied access to your Spotify account.',
    Verification: 'The verification token has expired or already been used.',
    Default: 'An unexpected error occurred during authentication.'
  };

  const message = errorMessages[error || 'Default'] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
      <div className="max-w-md w-full bg-bg-secondary rounded-lg shadow-xl p-8 text-center">
        <div className="text-error text-6xl mb-4">⚠</div>
        <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
        <p className="text-text-secondary mb-8">{message}</p>
        <Link
          href="/login"
          className="inline-block bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
```

## Step 4: Session Provider

Create `app/providers.tsx`:

```typescript
'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Update `app/layout.tsx`:

```typescript
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Step 5: Protected Route Middleware

Create `middleware.ts`:

```typescript
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login'
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/api/user/:path*', '/api/spotify/:path*']
};
```

## Step 6: Helper Functions

Create `lib/auth.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

## Step 7: Test Dashboard Page

Create `app/dashboard/page.tsx`:

```typescript
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-bg-dark p-8">
      <h1 className="text-3xl font-bold text-white mb-4">Dashboard</h1>
      <p className="text-text-secondary">Welcome, {user.name}!</p>
      <pre className="mt-4 p-4 bg-bg-secondary rounded text-sm">
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}
```

## Checklist

- [ ] NextAuth configured with Spotify provider
- [ ] Token refresh logic implemented
- [ ] Login page created
- [ ] Error page created
- [ ] Session provider added
- [ ] Middleware protecting routes
- [ ] Can sign in with Spotify
- [ ] Redirects to dashboard after login
- [ ] Session persists on refresh

## Testing

1. Visit http://localhost:3000/login
2. Click "Sign in with Spotify"
3. Authorize on Spotify
4. Verify redirect to dashboard
5. Check user created in database (Prisma Studio)
6. Refresh page - should stay logged in
7. Try accessing /dashboard without login - should redirect to /login

## Common Issues

**Issue:** Redirect URI mismatch
**Solution:** Ensure exact match in Spotify Dashboard: `http://localhost:3000/api/auth/callback/spotify`

**Issue:** Session not persisting
**Solution:** Check NEXTAUTH_SECRET is set in .env.local

**Issue:** Token refresh fails
**Solution:** Verify Client Secret is correct, check Spotify API logs

