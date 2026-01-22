# Feature: Public Profile Pages

## User Story

As a user, I want a public profile at tunehub.io/{username} to showcase my music stats.

## URL Structure

```
tunehub.io/{username}
- Public if user.isPublic = true
- 404 if private (unless owner)
```

## Page Sections

1. **ProfileHeader** - Avatar, username, settings button
2. **ListeningGraph** - 365-day contribution graph
3. **TopArtists** - Grid of top 20 artists
4. **TopTracks** - List of top 20 tracks
5. **MusicPersonality** - Personality tags and metrics
6. **ArtistLoyalty** - Streak information
7. **README** - Optional markdown bio

## Implementation

### Server Component
Fetch all data in parallel, use ISR for caching (1 hour revalidation).

### Privacy
- Public profiles visible to all
- Private profiles return 404 to non-owners
- Owner sees banner: "This profile is private"

### Performance
- ISR caching
- Pre-render top 100 profiles
- Lazy load graph on mobile
- Optimize images

## Acceptance Criteria

- Profile accessible at correct URL
- All sections display data
- Privacy controls work
- Mobile responsive
- SEO metadata included

## Edge Cases

See [Edge Cases: UI/UX](../edge-cases/ui-ux.md)

**Last Updated:** January 22, 2026
