# Security Architecture

**Purpose:** Authentication, authorization, and security best practices

---

## Authentication

### Spotify OAuth 2.0 Flow

**Scopes Required:**
```
user-read-email
user-read-private
user-top-read
user-read-recently-played
```

**NextAuth Configuration:**

```typescript
// lib/auth/auth-options.ts
export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'user-read-email user-read-private user-top-read user-read-recently-played'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: Date.now() + account.expires_in * 1000,
          user
        };
      }

      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user = token.user;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
};
```

### Token Refresh

```typescript
async function refreshAccessToken(token: JWT) {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string
      })
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken
    };
  } catch (error) {
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    };
  }
}
```

---

## Authorization

### Profile Access Control

```typescript
// app/[username]/page.tsx
export default async function ProfilePage({ params }) {
  const session = await getServerSession(authOptions);
  
  const user = await db.user.findUnique({
    where: { username: params.username }
  });

  if (!user) notFound();

  const isOwner = session?.user?.id === user.id;

  // Privacy check
  if (!user.isPublic && !isOwner) {
    notFound(); // 404 for private profiles
  }

  return <Profile user={user} isOwner={isOwner} />;
}
```

### API Route Protection

```typescript
// app/api/user/privacy/route.ts
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Authentication check
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { isPublic } = await req.json();

  // Authorization check - implicit (user can only update own profile)
  await db.user.update({
    where: { id: session.user.id },
    data: { isPublic }
  });

  return NextResponse.json({ success: true });
}
```

### Resource Ownership Validation

```typescript
// app/api/user/readme/route.ts
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, content } = await req.json();

  // Ownership check
  if (session.user.id !== userId) {
    return NextResponse.json(
      { error: 'Forbidden: Cannot edit another user\'s README' },
      { status: 403 }
    );
  }

  await db.user.update({
    where: { id: userId },
    data: { profileReadme: content }
  });

  return NextResponse.json({ success: true });
}
```

---

## XSS Prevention

### Sanitize User Input

```typescript
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

function sanitizeMarkdown(markdown: string): string {
  const html = marked(markdown) as string;
  
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'ul', 'ol', 'li',
      'a', 'h1', 'h2', 'h3', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOWED_URI_REGEXP: /^https?:\/\// // Only HTTP/HTTPS
  });
  
  return clean;
}

// API endpoint
export async function PATCH(req: Request) {
  const { readme } = await req.json();
  
  const safeReadme = sanitizeMarkdown(readme);
  
  await db.user.update({
    where: { id: userId },
    data: { profileReadme: safeReadme }
  });
}
```

### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https://i.scdn.co https://mosaic.scdn.co;
      font-src 'self';
      connect-src 'self' https://api.spotify.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  }
};
```

---

## CSRF Protection

NextAuth.js provides built-in CSRF protection via:
- CSRF tokens in forms
- SameSite cookie attribute
- Validation on state parameter

```typescript
// Automatically handled by NextAuth
// No additional configuration needed
```

---

## SQL Injection Prevention

### Use Prisma ORM

```typescript
// ✅ SAFE - Parameterized by Prisma
await db.user.findUnique({
  where: { username: userInput }
});

// ✅ SAFE - Parameterized raw query
await db.$executeRaw`
  SELECT * FROM users WHERE username = ${userInput}
`;

// ❌ DANGEROUS - String concatenation
await db.$executeRawUnsafe(
  `SELECT * FROM users WHERE username = '${userInput}'`
);
```

---

## Rate Limiting

### API Route Rate Limiting

```typescript
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(userId: string, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Usage in API route
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!rateLimit(session.user.id, 10, 60000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Process request
}
```

### Sync Rate Limiting

```typescript
// Enforce 1 sync per hour per user
const lastSync = await db.dailyListening.findFirst({
  where: { userId: session.user.id },
  orderBy: { createdAt: 'desc' }
});

if (lastSync) {
  const hoursSince = (Date.now() - lastSync.createdAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSince < 1) {
    return NextResponse.json(
      { 
        error: 'Rate limit: You can sync once per hour',
        retryAfter: Math.ceil((1 - hoursSince) * 3600)
      },
      { status: 429 }
    );
  }
}
```

---

## Token Security

### Never Expose Tokens to Client

```typescript
// ❌ WRONG - Tokens exposed
export async function GET() {
  const session = await getServerSession();
  return NextResponse.json({
    user: session.user,
    accessToken: session.accessToken // DANGEROUS!
  });
}

// ✅ CORRECT - No tokens sent
export async function GET() {
  const session = await getServerSession();
  return NextResponse.json({
    user: {
      id: session.user.id,
      username: session.user.name
    }
  });
}
```

### Server-Side Only Spotify Calls

```typescript
// All Spotify API calls must be server-side
async function fetchUserTopArtists(userId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Unauthorized');
  }

  const response = await fetch('https://api.spotify.com/v1/me/top/artists', {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  });

  return response.json();
}
```

---

## Environment Variables

### Required Variables

```bash
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..." # Generate with: openssl rand -base64 32
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."
```

### Security Best Practices

1. Never commit .env files to git
2. Use different secrets for dev/staging/production
3. Rotate secrets regularly
4. Use strong, random values for NEXTAUTH_SECRET
5. Restrict database user permissions

---

## HTTPS Only (Production)

```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  const { protocol } = req.nextUrl;

  if (protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    return NextResponse.redirect(
      `https://${req.headers.get('host')}${req.nextUrl.pathname}`
    );
  }

  return NextResponse.next();
}
```

---

## Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];
```

---

## Security Checklist

- [ ] NextAuth.js configured with NEXTAUTH_SECRET
- [ ] Spotify OAuth scopes minimal (least privilege)
- [ ] Token refresh implemented
- [ ] All API routes check session
- [ ] Ownership validation on mutations
- [ ] User input sanitized (DOMPurify)
- [ ] Prisma ORM used (no raw SQL concatenation)
- [ ] Rate limiting implemented
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] CSRF protection enabled (NextAuth)
- [ ] No tokens exposed to client
- [ ] Environment variables secured

---

**Last Updated:** January 22, 2026
