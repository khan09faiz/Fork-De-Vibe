# Feature: Profile README Editor

## User Story

As a user, I want to write a bio on my profile using Markdown formatting.

## Description

Markdown editor for creating a personal bio displayed on the public profile page.

## Constraints

- **Max length:** 5000 characters
- **Format:** Markdown (converted to HTML)
- **Sanitization:** DOMPurify to prevent XSS

## Implementation

### Editor Component

```typescript
'use client';
import { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export function ReadmeEditor({ initialContent, userId }: Props) {
  const [content, setContent] = useState(initialContent || '');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  
  async function handleSave() {
    const res = await fetch('/api/user/readme', {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
    
    if (res.ok) alert('Saved');
  }
  
  const html = DOMPurify.sanitize(marked(content), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title']
  });
  
  return (
    <div>
      <div>
        <button onClick={() => setTab('edit')}>Edit</button>
        <button onClick={() => setTab('preview')}>Preview</button>
        <button onClick={handleSave}>Save</button>
      </div>
      
      {tab === 'edit' ? (
        <textarea 
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={5000}
        />
      ) : (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      )}
      
      <p>{content.length}/5000 characters</p>
    </div>
  );
}
```

### API Endpoint

```typescript
// app/api/user/readme/route.ts
export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { content } = await req.json();
  
  if (content.length > 5000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 });
  }
  
  await db.user.update({
    where: { id: session.user.id },
    data: { profileReadme: content }
  });
  
  revalidatePath(`/[username]`);
  
  return NextResponse.json({ success: true });
}
```

## Allowed Markdown

- Headings (h1, h2, h3)
- Bold, italic
- Lists (ordered, unordered)
- Links
- Code blocks
- Line breaks

## Sanitization

DOMPurify removes:
- `<script>` tags
- `onclick`, `onerror` attributes
- `javascript:` URLs
- `<iframe>`, `<embed>`, `<object>` tags

## Display

On profile page, render sanitized HTML with prose styles:

```typescript
<div 
  className="prose prose-invert max-w-none"
  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
/>
```

## Acceptance Criteria

- Editor supports Markdown syntax
- Preview tab shows rendered HTML
- Character counter updates live
- Enforces 5000 char limit
- Sanitizes dangerous HTML
- Saves to database
- Empty state if no README

## Edge Cases

See [Edge Cases: Security](../edge-cases/security.md)

**Last Updated:** January 22, 2026
