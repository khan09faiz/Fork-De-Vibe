# Feature: Concert Discovery & Events

## Overview

A comprehensive concert discovery system that helps users find upcoming shows for their favorite artists. Features intelligent web scraping, location-based search, notifications, and social concert planning.

---

## User Stories

### Primary Stories
- **As a user**, I want to see upcoming concerts for my favorite artists in my region
- **As a user**, I want to search for concerts by location (country/city)
- **As a user**, I want to be notified when my favorite artists announce shows near me
- **As a user**, I want to save concerts I'm interested in attending

### Secondary Stories
- **As a user**, I want to see which of my friends are attending a concert
- **As a user**, I want concert recommendations based on my music taste
- **As a user**, I want to share concert plans on my profile
- **As a user**, I want ticket price comparisons from different vendors

---

## Feature Components

### 1. Location Management

**Automatic Country Detection:**
- User's country is automatically fetched from Spotify API during authentication
- Saved to `User.country` field (ISO 3166-1 alpha-2 code like "US", "GB", "IN")
- Updated automatically on each login if changed
- No manual input required for country-specific leaderboards and concert discovery

**Optional Detailed Location (UserLocation):**
- Users can optionally add specific city/region for more precise concert search
- Multiple locations supported (e.g., home city + frequent travel destinations)
- Automatically uses `User.country` if no `UserLocation` is set
- Useful for users who want sub-100km radius searches in specific cities

```typescript
interface UserLocation {
  id: string;
  userId: string;
  country: string;              // ISO 3166-1 alpha-2 code
  countryName: string;
  region?: string;              // State/Province (optional, for precise search)
  city?: string;                // City (optional, for precise search)
  latitude?: number;
  longitude?: number;
  searchRadius: number;         // km (default: 100)
  isDefault: boolean;
  createdAt: DateTime;
}

interface LocationSearchParams {
  country: string;
  region?: string;
  city?: string;
  radius?: number;              // Search radius in km
  artistIds?: string[];         // Filter by specific artists
  dateFrom?: Date;
  dateTo?: Date;
  genre?: string;
}

// Supported Countries (Initial Launch)
const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States', regions: ['California', 'New York', ...] },
  { code: 'GB', name: 'United Kingdom', regions: ['England', 'Scotland', ...] },
  { code: 'CA', name: 'Canada', regions: ['Ontario', 'British Columbia', ...] },
  { code: 'AU', name: 'Australia', regions: ['New South Wales', 'Victoria', ...] },
  { code: 'DE', name: 'Germany', regions: ['Bavaria', 'Berlin', ...] },
  { code: 'FR', name: 'France', regions: ['Île-de-France', 'Provence', ...] },
  { code: 'IN', name: 'India', regions: ['Maharashtra', 'Karnataka', ...] },
  // ... more countries
];
```

### 2. Concert Data Structure

```typescript
interface Concert {
  id: string;
  artistId: string;
  artistName: string;
  artistImageUrl: string;
  
  // Event Details
  eventName: string;            // "Taylor Swift | The Eras Tour"
  tourName?: string;            // "The Eras Tour"
  eventType: EventType;
  
  // Venue Information
  venue: Venue;
  
  // Date & Time
  date: Date;
  doorsOpen?: string;           // "18:00"
  startTime?: string;           // "20:00"
  timezone: string;
  
  // Ticket Information
  ticketStatus: TicketStatus;
  ticketUrl?: string;
  priceRange?: PriceRange;
  ticketSources: TicketSource[];
  
  // Additional Info
  supportingActs?: string[];
  ageRestriction?: string;      // "18+", "All Ages"
  description?: string;
  imageUrl?: string;
  
  // Metadata
  sourceId: string;             // ID from scraping source
  sourceName: string;           // "Ticketmaster", "Bandsintown"
  lastUpdatedAt: DateTime;
  verifiedAt?: DateTime;
  
  // Social
  interestedCount: number;
  attendingCount: number;
}

type EventType = 
  | 'concert'
  | 'festival'
  | 'tour'
  | 'residency'
  | 'acoustic_set'
  | 'album_release_party'
  | 'meet_and_greet'
  | 'virtual';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  region?: string;
  country: string;
  countryCode: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  venueType: VenueType;
  imageUrl?: string;
  website?: string;
}

type VenueType = 
  | 'stadium'
  | 'arena'
  | 'theater'
  | 'club'
  | 'outdoor'
  | 'festival_grounds'
  | 'other';

type TicketStatus = 
  | 'on_sale'
  | 'presale'
  | 'sold_out'
  | 'limited_availability'
  | 'not_yet_announced'
  | 'cancelled'
  | 'postponed'
  | 'resale_only';

interface PriceRange {
  currency: string;             // USD, EUR, GBP
  minPrice: number;
  maxPrice: number;
  averagePrice?: number;
}

interface TicketSource {
  name: string;                 // "Ticketmaster", "StubHub", "AXS"
  url: string;
  priceRange?: PriceRange;
  availability: 'available' | 'limited' | 'sold_out';
  isOfficial: boolean;          // Official vs resale
  fees?: number;                // Service fees
}
```

### 3. Web Scraping System

```typescript
// Scraper Configuration
interface ScraperConfig {
  sources: ScrapingSource[];
  rateLimits: RateLimitConfig;
  cacheSettings: CacheConfig;
  retryPolicy: RetryConfig;
}

interface ScrapingSource {
  name: string;
  baseUrl: string;
  priority: number;             // Higher = preferred
  reliability: number;          // 0-1 score
  dataFields: string[];         // What data this source provides
  rateLimit: number;            // Requests per minute
  requiresAuth: boolean;
  apiKey?: string;
}

const SCRAPING_SOURCES: ScrapingSource[] = [
  {
    name: 'Bandsintown',
    baseUrl: 'https://www.bandsintown.com',
    priority: 1,
    reliability: 0.95,
    dataFields: ['date', 'venue', 'tickets', 'lineup'],
    rateLimit: 30,
    requiresAuth: true
  },
  {
    name: 'Songkick',
    baseUrl: 'https://www.songkick.com',
    priority: 2,
    reliability: 0.90,
    dataFields: ['date', 'venue', 'tickets'],
    rateLimit: 20,
    requiresAuth: false
  },
  {
    name: 'Ticketmaster',
    baseUrl: 'https://www.ticketmaster.com',
    priority: 3,
    reliability: 0.85,
    dataFields: ['date', 'venue', 'tickets', 'prices'],
    rateLimit: 15,
    requiresAuth: true
  },
  {
    name: 'Spotify Events',
    baseUrl: 'https://open.spotify.com',
    priority: 4,
    reliability: 0.80,
    dataFields: ['date', 'venue'],
    rateLimit: 10,
    requiresAuth: false
  },
  {
    name: 'Google Events',
    baseUrl: 'https://www.google.com/search',
    priority: 5,
    reliability: 0.70,
    dataFields: ['date', 'venue', 'basic_info'],
    rateLimit: 10,
    requiresAuth: false
  }
];

// Scraper Implementation Strategy
interface ScrapingStrategy {
  // Method 1: API Integration (preferred)
  async fetchFromAPI(source: ScrapingSource, artistName: string, location: LocationSearchParams): Promise<Concert[]>;
  
  // Method 2: HTML Scraping (fallback)
  async scrapeHTML(source: ScrapingSource, artistName: string, location: LocationSearchParams): Promise<Concert[]>;
  
  // Method 3: AI-Assisted Search (last resort)
  async searchWithAI(artistName: string, location: LocationSearchParams): Promise<Concert[]>;
}
```

### 4. Scraper Job System

```typescript
interface ScrapingJob {
  id: string;
  type: 'artist_concerts' | 'location_concerts' | 'full_refresh';
  status: 'pending' | 'running' | 'completed' | 'failed';
  artistId?: string;
  location?: LocationSearchParams;
  startedAt?: DateTime;
  completedAt?: DateTime;
  concertsFound: number;
  errors: ScrapingError[];
  retryCount: number;
}

interface ScrapingSchedule {
  // Cron Jobs
  jobs: [
    {
      name: 'refresh_popular_artists',
      schedule: '0 */6 * * *',      // Every 6 hours
      description: 'Refresh concerts for top 100 artists'
    },
    {
      name: 'refresh_user_favorites',
      schedule: '0 8 * * *',         // Daily at 8 AM
      description: 'Refresh concerts for users\' top artists'
    },
    {
      name: 'update_ticket_status',
      schedule: '0 */2 * * *',       // Every 2 hours
      description: 'Update ticket availability status'
    },
    {
      name: 'cleanup_past_events',
      schedule: '0 0 * * *',         // Daily at midnight
      description: 'Remove past concerts from active listings'
    }
  ];
}

// Rate Limiting Strategy
interface RateLimitConfig {
  globalRequestsPerMinute: 100;
  perSourceLimits: Map<string, number>;
  backoffMultiplier: 2;
  maxBackoffSeconds: 300;
  circuitBreakerThreshold: 10;  // Errors before circuit break
}
```

### 5. Concert Search & Filtering

```typescript
interface ConcertSearchRequest {
  // Artist Filters
  artistIds?: string[];          // Specific artists
  fromUserTopArtists?: boolean;  // Use user's top artists
  genres?: string[];             // Filter by genre
  
  // Location Filters
  country: string;
  region?: string;
  city?: string;
  radius?: number;               // km from city center
  useUserLocation?: boolean;
  
  // Date Filters
  dateFrom?: Date;               // Default: today
  dateTo?: Date;                 // Default: 3 months out
  specificDates?: Date[];        // Exact dates
  weekendsOnly?: boolean;
  
  // Ticket Filters
  ticketStatus?: TicketStatus[];
  maxPrice?: number;
  currency?: string;
  includeResale?: boolean;
  
  // Event Type Filters
  eventTypes?: EventType[];
  venueTypes?: VenueType[];
  minCapacity?: number;
  maxCapacity?: number;
  
  // Sorting
  sortBy: 'date' | 'relevance' | 'distance' | 'price' | 'popularity';
  sortOrder: 'asc' | 'desc';
  
  // Pagination
  page: number;
  limit: number;
}

interface ConcertSearchResponse {
  concerts: Concert[];
  total: number;
  page: number;
  totalPages: number;
  filters: AppliedFilters;
  suggestions?: SearchSuggestion[];
}
```

---

## User Concert Interactions

### 6. User Concert Engagement

```typescript
interface UserConcertInteraction {
  id: string;
  userId: string;
  concertId: string;
  status: UserConcertStatus;
  ticketsPurchased?: number;
  reminderSet: boolean;
  reminderTime?: DateTime;
  notes?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

type UserConcertStatus = 
  | 'interested'     // User marked as interested
  | 'going'          // User plans to attend
  | 'attended'       // Past event, user attended
  | 'skipped';       // User decided not to go

interface ConcertReminder {
  id: string;
  userId: string;
  concertId: string;
  reminderType: ReminderType;
  scheduledFor: DateTime;
  sent: boolean;
  sentAt?: DateTime;
}

type ReminderType = 
  | 'presale_alert'           // Presale starting
  | 'on_sale_alert'           // General sale starting
  | 'price_drop'              // Price dropped
  | 'low_ticket_alert'        // Running low on tickets
  | 'event_tomorrow'          // Event is tomorrow
  | 'event_week'              // Event in one week
  | 'custom';                 // Custom reminder
```

### 7. Social Concert Features

```typescript
interface ConcertSocialFeatures {
  // Friends Attending
  friendsAttending: {
    userId: string;
    username: string;
    displayName: string;
    imageUrl: string;
    status: 'interested' | 'going';
  }[];
  
  // Concert Groups
  concertGroup?: {
    id: string;
    name: string;
    members: string[];
    chat?: ChatMessage[];
    meetupDetails?: MeetupDetails;
  };
  
  // Sharing
  shareOptions: {
    copyLink: string;
    twitterText: string;
    facebookUrl: string;
    instagramStory: boolean;
  };
}

interface MeetupDetails {
  location: string;
  time: string;
  notes: string;
  createdBy: string;
}
```

---

## UI/UX Micro-Features

### 8. Concert Discovery Interface

```typescript
const CONCERT_UX_FEATURES = {
  // Map View
  mapView: {
    clusterMarkers: true,           // Group nearby concerts
    venueInfo: true,                // Show venue details on click
    routePlanning: true,            // Directions to venue
    distanceLabels: true,           // Show distance from user
    filterByZoom: true              // Filter concerts based on zoom level
  },
  
  // Calendar View
  calendarView: {
    monthlyOverview: true,
    weeklyDetail: true,
    artistColorCoding: true,        // Each artist gets a color
    conflictHighlight: true,        // Highlight overlapping concerts
    syncToCalendar: true            // Export to Google/Apple Calendar
  },
  
  // List View
  listView: {
    cardLayout: true,
    compactLayout: true,
    groupByDate: true,
    groupByArtist: true,
    quickActions: true              // Quick interested/going buttons
  },
  
  // Concert Cards
  concertCard: {
    artistImage: true,
    venuePhoto: true,
    priceTag: true,
    availabilityBadge: true,
    distanceBadge: true,
    friendsAttendingAvatars: true,
    countdownTimer: true,           // Days until event
    quickShare: true
  },
  
  // Filters Panel
  filters: {
    quickFilters: ['This Week', 'This Month', 'My Artists'],
    savedFilters: true,             // Save custom filter presets
    recentSearches: true,
    clearAllButton: true
  },
  
  // Empty States
  emptyStates: {
    noConcertsFound: {
      message: 'No concerts found in your area',
      suggestions: ['Expand search radius', 'Try different dates', 'Follow more artists']
    },
    noLocationSet: {
      message: 'Set your location to discover concerts',
      cta: 'Set Location'
    }
  }
};
```

### 9. Notification & Alert Features

```typescript
const NOTIFICATION_FEATURES = {
  // Push Notifications
  pushNotifications: {
    newConcertAnnounced: true,
    presaleStarting: true,
    ticketsOnSale: true,
    lowTicketWarning: true,
    priceDropAlert: true,
    eventReminder: true,
    friendGoing: true
  },
  
  // Email Notifications
  emailDigest: {
    frequency: 'weekly',            // daily, weekly, never
    includeNewConcerts: true,
    includePriceChanges: true,
    includeRecommendations: true
  },
  
  // In-App Notifications
  inAppAlerts: {
    banner: true,
    toast: true,
    badge: true,
    soundEnabled: false             // User preference
  },
  
  // Notification Settings
  notificationPreferences: {
    byArtist: Map<string, boolean>,  // Per-artist notification settings
    byEventType: Map<EventType, boolean>,
    quietHours: { start: '22:00', end: '08:00' },
    maxPerDay: 10
  }
};
```

### 10. Concert Recommendations

```typescript
interface ConcertRecommendation {
  concert: Concert;
  score: number;                    // 0-100 relevance score
  reasons: RecommendationReason[];
}

interface RecommendationReason {
  type: RecommendationReasonType;
  description: string;
  weight: number;
}

type RecommendationReasonType = 
  | 'top_artist'                    // Artist in user's top artists
  | 'similar_artist'                // Similar to user's favorites
  | 'genre_match'                   // Matches user's genre preferences
  | 'friends_going'                 // Friends are attending
  | 'nearby'                        // Close to user's location
  | 'trending'                      // Popular/trending event
  | 'price_drop'                    // Recent price decrease
  | 'last_chance'                   // Almost sold out
  | 'new_announcement';             // Just announced

// Recommendation Algorithm
function calculateRecommendationScore(
  concert: Concert,
  user: User,
  userTopArtists: Artist[],
  userLocation: UserLocation
): ConcertRecommendation {
  let score = 0;
  const reasons: RecommendationReason[] = [];
  
  // Top artist match (40 points max)
  const artistRank = userTopArtists.findIndex(a => a.spotifyId === concert.artistId);
  if (artistRank >= 0) {
    const artistScore = 40 - (artistRank * 2);
    score += Math.max(artistScore, 10);
    reasons.push({
      type: 'top_artist',
      description: `#${artistRank + 1} in your top artists`,
      weight: artistScore
    });
  }
  
  // Distance score (20 points max)
  const distance = calculateDistance(userLocation, concert.venue);
  if (distance < 50) {
    score += 20;
    reasons.push({ type: 'nearby', description: 'Very close to you', weight: 20 });
  } else if (distance < 100) {
    score += 15;
    reasons.push({ type: 'nearby', description: 'Within 100km', weight: 15 });
  }
  
  // Genre match (20 points max)
  // ... genre matching logic
  
  // Friends going (10 points max)
  // ... social scoring logic
  
  // Trending/popularity (10 points max)
  // ... popularity scoring logic
  
  return { concert, score, reasons };
}
```

---

## Technical Implementation

### 11. Database Schema

```prisma
// Add to schema.prisma

model Concert {
  id              String   @id @default(cuid())
  artistId        String   @map("artist_id")
  artistName      String   @map("artist_name")
  artistImageUrl  String?  @map("artist_image_url")
  
  // Event Details
  eventName       String   @map("event_name")
  tourName        String?  @map("tour_name")
  eventType       String   @map("event_type")
  
  // Venue
  venueId         String   @map("venue_id")
  
  // Date & Time
  date            DateTime
  doorsOpen       String?  @map("doors_open")
  startTime       String?  @map("start_time")
  timezone        String
  
  // Tickets
  ticketStatus    String   @map("ticket_status")
  ticketUrl       String?  @map("ticket_url")
  minPrice        Float?   @map("min_price")
  maxPrice        Float?   @map("max_price")
  currency        String?
  
  // Additional Info
  supportingActs  String[] @map("supporting_acts")
  ageRestriction  String?  @map("age_restriction")
  description     String?  @db.Text
  imageUrl        String?  @map("image_url")
  
  // Scraping Metadata
  sourceId        String   @map("source_id")
  sourceName      String   @map("source_name")
  lastScrapedAt   DateTime @map("last_scraped_at")
  verifiedAt      DateTime? @map("verified_at")
  
  // Counts
  interestedCount Int      @default(0) @map("interested_count")
  attendingCount  Int      @default(0) @map("attending_count")
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  venue           Venue    @relation(fields: [venueId], references: [id])
  ticketSources   TicketSource[]
  userInteractions UserConcertInteraction[]
  
  @@unique([sourceId, sourceName])
  @@index([artistId, date])
  @@index([date])
  @@index([venueId])
  @@map("concerts")
}

model Venue {
  id          String   @id @default(cuid())
  name        String
  address     String
  city        String
  region      String?
  country     String
  countryCode String   @map("country_code")
  postalCode  String?  @map("postal_code")
  latitude    Float
  longitude   Float
  capacity    Int?
  venueType   String   @map("venue_type")
  imageUrl    String?  @map("image_url")
  website     String?
  createdAt   DateTime @default(now()) @map("created_at")
  
  concerts    Concert[]
  
  @@unique([name, city, countryCode])
  @@index([city, countryCode])
  @@index([latitude, longitude])
  @@map("venues")
}

model TicketSource {
  id            String   @id @default(cuid())
  concertId     String   @map("concert_id")
  name          String
  url           String
  minPrice      Float?   @map("min_price")
  maxPrice      Float?   @map("max_price")
  currency      String?
  availability  String
  isOfficial    Boolean  @map("is_official")
  fees          Float?
  lastCheckedAt DateTime @map("last_checked_at")
  
  concert       Concert  @relation(fields: [concertId], references: [id], onDelete: Cascade)
  
  @@index([concertId])
  @@map("ticket_sources")
}

model UserLocation {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  country      String
  countryName  String   @map("country_name")
  region       String?
  city         String?
  latitude     Float?
  longitude    Float?
  searchRadius Int      @default(100) @map("search_radius")
  isDefault    Boolean  @default(false) @map("is_default")
  createdAt    DateTime @default(now()) @map("created_at")
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("user_locations")
}

model UserConcertInteraction {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  concertId       String    @map("concert_id")
  status          String
  ticketsPurchased Int?     @map("tickets_purchased")
  reminderSet     Boolean   @default(false) @map("reminder_set")
  reminderTime    DateTime? @map("reminder_time")
  notes           String?   @db.Text
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  concert         Concert   @relation(fields: [concertId], references: [id], onDelete: Cascade)
  
  @@unique([userId, concertId])
  @@index([userId, status])
  @@map("user_concert_interactions")
}

model ConcertReminder {
  id           String    @id @default(cuid())
  userId       String    @map("user_id")
  concertId    String    @map("concert_id")
  reminderType String    @map("reminder_type")
  scheduledFor DateTime  @map("scheduled_for")
  sent         Boolean   @default(false)
  sentAt       DateTime? @map("sent_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([scheduledFor, sent])
  @@map("concert_reminders")
}

model ScrapingJob {
  id             String    @id @default(cuid())
  type           String
  status         String
  artistId       String?   @map("artist_id")
  location       Json?
  startedAt      DateTime? @map("started_at")
  completedAt    DateTime? @map("completed_at")
  concertsFound  Int       @default(0) @map("concerts_found")
  errors         Json?
  retryCount     Int       @default(0) @map("retry_count")
  createdAt      DateTime  @default(now()) @map("created_at")
  
  @@index([status, createdAt])
  @@map("scraping_jobs")
}

model ConcertNotificationPreference {
  id               String   @id @default(cuid())
  userId           String   @map("user_id")
  artistId         String?  @map("artist_id") // null = all artists
  newConcerts      Boolean  @default(true) @map("new_concerts")
  presaleAlerts    Boolean  @default(true) @map("presale_alerts")
  onSaleAlerts     Boolean  @default(true) @map("on_sale_alerts")
  priceDrops       Boolean  @default(false) @map("price_drops")
  eventReminders   Boolean  @default(true) @map("event_reminders")
  friendActivity   Boolean  @default(true) @map("friend_activity")
  
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, artistId])
  @@map("concert_notification_preferences")
}
```

### 12. API Routes

```typescript
// app/api/concerts/route.ts - Concert endpoints

// Search & Discovery
// GET  /api/concerts?country=US&region=CA&artistIds=xxx,yyy
// GET  /api/concerts/recommendations
// GET  /api/concerts/{id}

// User Interactions
// POST /api/concerts/{id}/interest     // Mark as interested
// POST /api/concerts/{id}/going        // Mark as going
// DELETE /api/concerts/{id}/interest   // Remove interest

// Location Management
// GET  /api/user/locations
// POST /api/user/locations
// PUT  /api/user/locations/{id}
// DELETE /api/user/locations/{id}

// Reminders
// POST /api/concerts/{id}/reminder
// DELETE /api/concerts/{id}/reminder

// Social
// GET  /api/concerts/{id}/friends      // Friends attending
// GET  /api/user/concerts              // User's saved concerts

// Admin/Scraping (internal)
// POST /api/admin/scraping/trigger
// GET  /api/admin/scraping/status
```

### 13. Scraping Service Implementation (FREE APIs)

```typescript
// lib/services/concert-scraper.ts

// Using FREE APIs: Bandsintown, Songkick, Puppeteer
// NO paid services like Firecrawl

interface ScrapingService {
  // Main scraping functions
  async scrapeArtistConcerts(artistName: string, artistId: string): Promise<Concert[]>;
  async scrapeLocationConcerts(location: LocationSearchParams): Promise<Concert[]>;
  
  // Free API sources
  async fetchBandsintownAPI(artistName: string): Promise<Concert[]>;  // Free API
  async fetchSongkickAPI(artistName: string): Promise<Concert[]>;     // Free tier
  async scrapeWithPuppeteer(url: string): Promise<Concert[]>;         // Free, self-hosted
  
  // Data processing
  async normalizeConcertData(rawData: RawConcertData[]): Promise<Concert[]>;
  async deduplicateConcerts(concerts: Concert[]): Promise<Concert[]>;
  async validateConcertData(concert: Concert): Promise<boolean>;
  
  // Scheduling
  async scheduleRefresh(artistId: string, priority: number): void;
  async processScrapingQueue(): void;
}

// Example using FREE Bandsintown API
async function discoverConcerts(artistName: string, country: string): Promise<Concert[]> {
  const appId = process.env.BANDSINTOWN_APP_ID || 'tunehub';
  
  // Fetch from Bandsintown (free API)
  const response = await fetch(
    `https://rest.bandsintown.com/artists/${encodeURIComponent(artistName)}/events?app_id=${appId}`
  );
  
  if (!response.ok) return [];
  
  const events = await response.json();
  
  // Filter by country and normalize
  return events
    .filter((e: any) => e.venue?.country === country)
    .map((e: any) => ({
      eventName: e.title || `${artistName} Live`,
      date: e.datetime?.split('T')[0],
      venueName: e.venue?.name,
      city: e.venue?.city,
      country: e.venue?.country,
      ticketUrl: e.offers?.[0]?.url,
      ticketStatus: e.offers?.length > 0 ? 'on_sale' : 'not_announced'
    }));
}

// Songkick free tier example
async function fetchSongkickConcerts(artistName: string): Promise<Concert[]> {
  const apiKey = process.env.SONGKICK_API_KEY;
  
  // Search for artist
  const searchRes = await fetch(
    `https://api.songkick.com/api/3.0/search/artists.json?apikey=${apiKey}&query=${encodeURIComponent(artistName)}`
  );
  const searchData = await searchRes.json();
  const artistId = searchData.resultsPage?.results?.artist?.[0]?.id;
  
  if (!artistId) return [];
  
  // Fetch calendar
  const calendarRes = await fetch(
    `https://api.songkick.com/api/3.0/artists/${artistId}/calendar.json?apikey=${apiKey}`
  );
  const calendarData = await calendarRes.json();
  
  return (calendarData.resultsPage?.results?.event || []).map((e: any) => ({
    eventName: e.displayName,
    date: e.start?.date,
    venueName: e.venue?.displayName,
    city: e.location?.city?.split(',')[0],
    country: e.location?.city?.split(',').slice(-1)[0]?.trim(),
    ticketUrl: e.uri,
    ticketStatus: e.status === 'ok' ? 'on_sale' : 'cancelled'
  }));
}
```
```

---

## Integration with Existing Features

### Connection to Top Artists
- Auto-discover concerts for user's top artists
- "Find Concerts" button on artist cards
- Priority notifications for top artist shows

### Connection to Music Personality
- Concert recommendations based on personality type
- "Explorer" types get more diverse recommendations
- "Loyalist" types see their favorite artists first

### Connection to Profile
- "Upcoming Concerts" section on profile
- Concert attendance history
- Share concert plans with followers

### Connection to Quiz Feature
- Earn bonus XP for attending concerts
- Special "Concert Goer" badges
- Quiz questions about artists you've seen live

---

## Acceptance Criteria

1. ✅ Users can set their location (country/region/city)
2. ✅ Users can search for concerts by location and date
3. ✅ Concert data is scraped and updated regularly
4. ✅ Users can mark concerts as interested/going
5. ✅ Users receive notifications for new concerts
6. ✅ Map view shows concert locations
7. ✅ Calendar view shows concerts by date
8. ✅ Users can see friends attending concerts
9. ✅ Ticket prices and availability are shown
10. ✅ Concert recommendations are personalized

---

## Edge Cases

See [/docs/edge-cases/concerts.md](../edge-cases/concerts.md) for:
- Handling cancelled/postponed events
- Dealing with incorrect scraped data
- Rate limiting scraping requests
- Timezone handling for events
- Duplicate event detection
- Handling sold-out events
