# Features Documentation

This directory contains detailed specifications for all TuneHub features.

## Feature List

### Core Features
1. [Authentication](01-authentication.md) - Spotify OAuth login
2. [Public Profiles](02-public-profiles.md) - Shareable profile pages
3. [Listening Graph](03-listening-graph.md) - GitHub-style contribution graph
4. [Top Content](04-top-content.md) - Top artists and tracks display
5. [Music Personality](05-personality.md) - Personality trait calculation
6. [Artist Loyalty](06-loyalty.md) - Streak tracking
7. [Profile README](07-readme.md) - Markdown bio editor
8. [Data Sync](08-data-sync.md) - Spotify data synchronization
9. [Privacy Controls](09-privacy.md) - Public/private toggle

### New Features (v2.0)
10. [Artist Quiz & Leaderboard](10-artist-quiz.md) - **NEW** AI-powered quizzes
11. [Concert Discovery](11-concert-discovery.md) - **NEW** Live show finder

## Feature Interconnections

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER PROFILE                            │
├─────────────┬─────────────┬─────────────┬─────────────┬────────┤
│  Top Artists│ Personality │  Quiz Stats │  Concerts   │ Badges │
│     ↓       │      ↓      │      ↓      │      ↓      │    ↓   │
├─────────────┼─────────────┼─────────────┼─────────────┼────────┤
│ Quiz about  │ Quiz affects│ Leaderboard │ Concert     │ Earned │
│ favorites   │ personality │ rankings    │ alerts for  │ from   │
│             │ tags        │             │ top artists │ quizzes│
└─────────────┴─────────────┴─────────────┴─────────────┴────────┘
```

## Reading Order

For implementation, read in numeric order. Each feature document includes:
- User stories
- Technical specifications
- Implementation code examples
- Acceptance criteria
- Edge case references

## New Features Integration Points

### Artist Quiz connects to:
- **Top Artists**: Quiz suggestions based on user's favorites
- **Personality**: Quiz mastery badges affect personality tags
- **Profile**: Quiz stats and badges displayed publicly

### Concert Discovery connects to:
- **Top Artists**: Auto-discover concerts for favorites
- **Personality**: Concert recommendations based on type
- **Profile**: Upcoming concerts section
- **Quiz**: Bonus XP for concert attendance

## Cross-References

- Architecture: See [/docs/architecture/](../architecture/)
- Design: See [/docs/design/](../design/)
- Implementation: See [/docs/implementation/](../implementation/)
- Edge Cases: See [/docs/edge-cases/](../edge-cases/)
