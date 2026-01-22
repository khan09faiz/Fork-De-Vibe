# Security Edge Cases

**Purpose:** Prevent XSS, token leakage, and unauthorized access

---

## 1. XSS in Profile README

**Problem:**
- User inputs malicious markdown with scripts
- Rendered HTML executes JavaScript
- Can steal tokens or session data

**Attack Vectors:**

```markdown
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
[Click me](javascript:alert('XSS'))
<iframe src="javascript:alert('XSS')"></iframe>
```

**Impact:**
- Account takeover
- Data theft
- Session hijacking

**Mitigation:**

```typescript
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

function sanitizeMarkdown(markdown: string): string {
  const html = marked(markdown) as string;
  
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOWED_URI_REGEXP: /^https?:\/\//
  });
  
  return clean;
}

export async function PATCH(req: Request) {
  const { readme } = await req.json();
  
  if (readme.length > 5000) {
    return NextResponse.json({ error: 'README too long' }, { status: 400 });
  }
  
  const safeReadme = sanitizeMarkdown(readme);
  
  await db.user.update({
    where: { id: userId },
    data: { profileReadme: safeReadme }
  });
}
```

**Critical Rules:**
- Always sanitize user-generated HTML
- Never trust user input
- Never allow script tags
- Never allow javascript: URLs
- Never allow data: URLs
- Always whitelist allowed tags and attributes

---

## 2. Token Leakage to Client

**Problem:**
- Accidentally sending accessToken in API response
- Exposing tokens in client-side code
- Tokens visible in Network tab

**Impact:**
- Attacker can hijack Spotify account
- Unauthorized API calls
- Data theft

**Mitigation:**

```typescript
// ❌ WRONG - Never do this
export async function GET(req: Request) {
  const session = await getServerSession();
  
  return NextResponse.json({
    user: session.user,
    accessToken: session.accessToken  // DANGEROUS!
  });
}

// ✅ CORRECT
export async function GET(req: Request) {
  const session = await getServerSession();
  
  return NextResponse.json({
    user: {
      id: session.user.id,
      username: session.user.name,
      image: session.user.image
    }
  });
}

// ✅ All Spotify calls server-side only
async function fetchUserTopArtists(userId: string) {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  const response = await fetch('https://api.spotify.com/v1/me/top/artists', {
    headers: { Authorization: `Bearer ${session.accessToken}` }
  });
  
  return response.json();
}
```

**Critical Rules:**
- Never expose accessToken to client
- Never expose refreshToken to client
- Always call Spotify API from server-side only
- Never log tokens
- Never store tokens in localStorage

---

## 3. Unauthorized Profile Access

**Problem:**
- User A tries to edit User B's profile
- API doesn't verify ownership
- Missing authorization checks

**Impact:**
- Data manipulation
- Privacy violation
- Account takeover

**Mitigation:**

```typescript
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { userId, readme } = await req.json();
  
  if (session.user.id !== userId) {
    return NextResponse.json(
      { error: 'Forbidden: Cannot edit another user\'s profile' },
      { status: 403 }
    );
  }
  
  await db.user.update({
    where: { id: userId },
    data: { profileReadme: readme }
  });
  
  return NextResponse.json({ success: true });
}
```

**Authorization Checklist:**
- [ ] Session verification
- [ ] User ID ownership check
- [ ] Resource ownership validation
- [ ] Proper error codes (401 vs 403)

---

## 4. CSRF Protection

**Problem:**
- Cross-Site Request Forgery attacks
- Malicious sites make requests on behalf of user

**Impact:**
- Unauthorized actions
- Data modification

**Mitigation:**

```typescript
// NextAuth.js provides CSRF protection automatically
// Ensure NEXTAUTH_SECRET is set

// For custom API routes
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Session validated, proceed with action
}
```

**Rules:**
- Always use getServerSession for protected routes
- Never accept authentication from query params
- Always validate session on server side

---

## 5. SQL Injection

**Problem:**
- Malicious input in database queries
- Raw SQL with user input

**Impact:**
- Data breach
- Data corruption
- Unauthorized access

**Mitigation:**

```typescript
// ✅ CORRECT - Prisma ORM prevents SQL injection
await db.user.findUnique({
  where: { username: userInput }
});

// ❌ WRONG - Raw SQL with concatenation
await db.$executeRaw`SELECT * FROM users WHERE username = '${userInput}'`;

// ✅ CORRECT - Parameterized raw query
await db.$executeRaw`SELECT * FROM users WHERE username = ${userInput}`;
```

**Rules:**
- Always use Prisma ORM methods
- Never concatenate strings in raw SQL
- Always use parameterized queries if raw SQL needed

---

## 6. Rate Limiting

**Problem:**
- Brute force attacks
- API abuse
- DDoS attempts

**Impact:**
- Service degradation
- High costs
- Security breaches

**Mitigation:**

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Or use simple timestamp-based limiting
async function checkRateLimit(userId: string, action: string) {
  const lastAction = await db.userAction.findFirst({
    where: { userId, action },
    orderBy: { createdAt: 'desc' }
  });

  if (lastAction) {
    const timeSinceLastMs = Date.now() - lastAction.createdAt.getTime();
    const minIntervalMs = 60 * 60 * 1000; // 1 hour

    if (timeSinceLastMs < minIntervalMs) {
      throw new Error('Rate limit exceeded');
    }
  }

  await db.userAction.create({
    data: { userId, action, createdAt: new Date() }
  });
}
```

---

## 7. Input Validation

**Problem:**
- Unexpected input types
- Malformed data
- Buffer overflows (in strings)

**Impact:**
- Application crashes
- Data corruption
- Security vulnerabilities

**Mitigation:**

```typescript
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  displayName: z.string().max(50).optional(),
  readme: z.string().max(5000).optional(),
  isPublic: z.boolean()
});

export async function PATCH(req: Request) {
  const body = await req.json();
  
  const validation = UpdateProfileSchema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.errors },
      { status: 400 }
    );
  }
  
  const data = validation.data;
  // Now data is validated and safe to use
}
```

**Rules:**
- Always validate input
- Always enforce length limits
- Always use type checking
- Never trust client-side validation only

---

## Security Testing Checklist

- [ ] XSS prevention verified
- [ ] Tokens never exposed to client
- [ ] Authorization checks on all routes
- [ ] CSRF protection enabled
- [ ] SQL injection prevented (using ORM)
- [ ] Rate limiting implemented
- [ ] Input validation working
- [ ] Error messages don't leak sensitive info

**Last Updated:** January 22, 2026
