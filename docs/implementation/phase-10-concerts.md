# Phase 10: Concert Discovery Implementation

**Duration:** 8-10 hours  
**Prerequisites:** Phase 1-7 completed, Free APIs: Bandsintown + Songkick + Puppeteer

---

## Goals

- Build web scraping system for concert data using free APIs
- Create concert search and discovery
- Implement user interactions (interested/going)
- Build concert notification system
- Create concert UI components
- **Note:** User country is automatically fetched from Spotify during login (Phase 2)

---

## Step 1: Database Schema Update

Add concert-related models to `prisma/schema.prisma`:

**Important:** User's country is automatically saved during authentication (see Phase 2). The `UserLocation` model is **optional** and only needed if users want to specify a precise city/region for sub-100km radius searches.

```prisma
// Add these models to schema.prisma

model Concert {
  id              String   @id @default(cuid())
  artistId        String   @map("artist_id")
  artistName      String   @map("artist_name")
  artistImageUrl  String?  @map("artist_image_url")
  
  eventName       String   @map("event_name")
  tourName        String?  @map("tour_name")
  eventType       String   @default("concert") @map("event_type")
  
  venueId         String   @map("venue_id")
  
  date            DateTime
  doorsOpen       String?  @map("doors_open")
  startTime       String?  @map("start_time")
  timezone        String
  
  ticketStatus    String   @default("on_sale") @map("ticket_status")
  ticketUrl       String?  @map("ticket_url")
  minPrice        Float?   @map("min_price")
  maxPrice        Float?   @map("max_price")
  currency        String?
  
  supportingActs  String[] @map("supporting_acts")
  ageRestriction  String?  @map("age_restriction")
  description     String?  @db.Text
  imageUrl        String?  @map("image_url")
  
  sourceId        String   @map("source_id")
  sourceName      String   @map("source_name")
  lastScrapedAt   DateTime @default(now()) @map("last_scraped_at")
  
  interestedCount Int      @default(0) @map("interested_count")
  attendingCount  Int      @default(0) @map("attending_count")
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  venue             Venue                    @relation(fields: [venueId], references: [id])
  ticketSources     TicketSource[]
  userInteractions  UserConcertInteraction[]
  
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
  venueType   String   @default("other") @map("venue_type")
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
  availability  String   @default("available")
  isOfficial    Boolean  @default(true) @map("is_official")
  fees          Float?
  lastCheckedAt DateTime @default(now()) @map("last_checked_at")
  
  concert       Concert  @relation(fields: [concertId], references: [id], onDelete: Cascade)
  
  @@index([concertId])
  @@map("ticket_sources")
}

// OPTIONAL: UserLocation for detailed city/region-specific searches
// Note: User.country is automatically fetched from Spotify (Phase 2)
// Only create UserLocation if user wants to specify precise city/region
model UserLocation {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  country      String   // ISO 3166-1 alpha-2 (same as User.country)
  countryName  String   @map("country_name")
  region       String?  // Optional: State/Province for precise search
  city         String?  // Optional: City for precise search
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
  status          String    @default("interested")
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
  status         String    @default("pending")
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
```

Run migration:
```bash
npx prisma migrate dev --name add_concert_system
```

---

## Step 2: Concert Scraping Service

Create `lib/services/concert-scraper.ts`:

```typescript
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

interface ScrapedConcert {
  artistName: string;
  eventName: string;
  date: string;
  venueName: string;
  city: string;
  country: string;
  ticketUrl?: string;
  ticketStatus?: string;
  priceRange?: { min: number; max: number };
}

// Free API: Bandsintown (https://artists.bandsintown.com/support/api-installation)
export async function fetchFromBandsintown(artistName: string): Promise<ScrapedConcert[]> {
  const appId = process.env.BANDSINTOWN_APP_ID || 'tunehub';
  const encodedArtist = encodeURIComponent(artistName);
  
  try {
    const response = await fetch(
      `https://rest.bandsintown.com/artists/${encodedArtist}/events?app_id=${appId}`
    );
    
    if (!response.ok) return [];
    
    const events = await response.json();
    
    return events.map((event: any) => ({
      artistName: event.artist?.name || artistName,
      eventName: event.title || `${artistName} Live`,
      date: event.datetime?.split('T')[0],
      venueName: event.venue?.name,
      city: event.venue?.city,
      country: event.venue?.country,
      ticketUrl: event.offers?.[0]?.url,
      ticketStatus: event.offers?.length > 0 ? 'on_sale' : 'not_announced'
    }));
  } catch (error) {
    console.error(`Bandsintown fetch failed for ${artistName}:`, error);
    return [];
  }
}

// Free API: Songkick (https://www.songkick.com/developer)
export async function fetchFromSongkick(artistName: string): Promise<ScrapedConcert[]> {
  const apiKey = process.env.SONGKICK_API_KEY;
  if (!apiKey) {
    console.warn('SONGKICK_API_KEY not set, skipping Songkick');
    return [];
  }
  
  try {
    // First search for artist ID
    const searchResponse = await fetch(
      `https://api.songkick.com/api/3.0/search/artists.json?apikey=${apiKey}&query=${encodeURIComponent(artistName)}`
    );
    
    if (!searchResponse.ok) return [];
    
    const searchData = await searchResponse.json();
    const artist = searchData.resultsPage?.results?.artist?.[0];
    if (!artist) return [];
    
    // Then fetch events
    const eventsResponse = await fetch(
      `https://api.songkick.com/api/3.0/artists/${artist.id}/calendar.json?apikey=${apiKey}`
    );
    
    if (!eventsResponse.ok) return [];
    
    const eventsData = await eventsResponse.json();
    const events = eventsData.resultsPage?.results?.event || [];
    
    return events.map((event: any) => ({
      artistName: artistName,
      eventName: event.displayName,
      date: event.start?.date,
      venueName: event.venue?.displayName,
      city: event.location?.city?.split(',')[0],
      country: event.location?.city?.split(',').slice(-1)[0]?.trim(),
      ticketUrl: event.uri,
      ticketStatus: event.status === 'ok' ? 'on_sale' : 'cancelled'
    }));
  } catch (error) {
    console.error(`Songkick fetch failed for ${artistName}:`, error);
    return [];
  }
}

// Puppeteer fallback for scraping (free, self-hosted)
export async function scrapeTicketmaster(artistName: string): Promise<ScrapedConcert[]> {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto(
      `https://www.ticketmaster.com/search?q=${encodeURIComponent(artistName)}`,
      { waitUntil: 'networkidle2', timeout: 30000 }
    );
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const concerts: ScrapedConcert[] = [];
    
    // Parse event cards (structure may change, update selectors as needed)
    $('[data-testid="event-card"]').each((_, el) => {
      const eventName = $(el).find('[data-testid="event-name"]').text().trim();
      const dateText = $(el).find('[data-testid="event-date"]').text().trim();
      const venue = $(el).find('[data-testid="venue-name"]').text().trim();
      const location = $(el).find('[data-testid="venue-location"]').text().trim();
      const ticketUrl = $(el).find('a').attr('href');
      
      if (eventName && dateText) {
        concerts.push({
          artistName,
          eventName,
          date: parseDate(dateText),
          venueName: venue,
          city: location.split(',')[0]?.trim() || '',
          country: location.split(',').slice(-1)[0]?.trim() || 'US',
          ticketUrl: ticketUrl ? `https://www.ticketmaster.com${ticketUrl}` : undefined,
          ticketStatus: 'on_sale'
        });
      }
    });
    
    return concerts;
  } catch (error) {
    console.error(`Ticketmaster scrape failed for ${artistName}:`, error);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

// Aggregate from all free sources
export async function scrapeArtistConcerts(
  artistName: string,
  country?: string
): Promise<ScrapedConcert[]> {
  // Fetch from all free sources in parallel
  const [bandsintown, songkick, ticketmaster] = await Promise.all([
    fetchFromBandsintown(artistName),
    fetchFromSongkick(artistName),
    scrapeTicketmaster(artistName)
  ]);
  
  // Combine and deduplicate
  const allConcerts = [...bandsintown, ...songkick, ...ticketmaster];
  const deduped = deduplicateConcerts(allConcerts);
  
  // Filter by country if specified
  if (country) {
    return deduped.filter(c => 
      c.country?.toLowerCase().includes(country.toLowerCase()) ||
      getCountryCode(c.country) === country.toUpperCase()
    );
  }
  
  return deduped;
}

function deduplicateConcerts(concerts: ScrapedConcert[]): ScrapedConcert[] {
  const seen = new Map<string, ScrapedConcert>();
  
  for (const concert of concerts) {
    // Create unique key from artist + date + venue
    const key = `${concert.artistName?.toLowerCase()}_${concert.date}_${concert.venueName?.toLowerCase()}`;
    
    if (!seen.has(key)) {
      seen.set(key, concert);
    }
  }
  
  return Array.from(seen.values());
}

function parseDate(dateText: string): string {
  // Parse various date formats to YYYY-MM-DD
  const date = new Date(dateText);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return dateText;
}

function getCountryCode(country: string): string {
  const codes: Record<string, string> = {
    'united states': 'US', 'usa': 'US', 'us': 'US',
    'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB',
    'canada': 'CA', 'australia': 'AU', 'germany': 'DE',
    'france': 'FR', 'india': 'IN', 'japan': 'JP'
  };
  return codes[country?.toLowerCase()] || country?.slice(0, 2).toUpperCase() || 'US';
}
```
```

---

## Step 3: Concert Data Processing

Create `lib/services/concert-processor.ts`:

```typescript
import { db } from '@/lib/db';

interface ProcessedConcert {
  artistId: string;
  artistName: string;
  eventName: string;
  date: Date;
  venue: {
    name: string;
    city: string;
    country: string;
    countryCode: string;
  };
  ticketStatus: string;
  ticketUrl?: string;
  minPrice?: number;
  maxPrice?: number;
  sourceId: string;
  sourceName: string;
}

export async function processConcerts(
  scrapedConcerts: any[],
  sourceName: string
): Promise<number> {
  let processed = 0;

  for (const concert of scrapedConcerts) {
    try {
      // Get or create venue
      const venue = await db.venue.upsert({
        where: {
          name_city_countryCode: {
            name: concert.venueName,
            city: concert.city,
            countryCode: getCountryCode(concert.country)
          }
        },
        create: {
          name: concert.venueName,
          address: concert.address || concert.venueName,
          city: concert.city,
          country: concert.country,
          countryCode: getCountryCode(concert.country),
          latitude: concert.latitude || 0,
          longitude: concert.longitude || 0
        },
        update: {}
      });

      // Create concert
      const sourceId = `${concert.artistName}-${concert.date}-${venue.id}`;
      
      await db.concert.upsert({
        where: {
          sourceId_sourceName: {
            sourceId,
            sourceName
          }
        },
        create: {
          artistId: concert.artistId || concert.artistName.toLowerCase().replace(/\s+/g, '-'),
          artistName: concert.artistName,
          eventName: concert.eventName || `${concert.artistName} Live`,
          venueId: venue.id,
          date: new Date(concert.date),
          timezone: concert.timezone || 'UTC',
          ticketStatus: concert.ticketStatus || 'on_sale',
          ticketUrl: concert.ticketUrl,
          minPrice: concert.minPrice,
          maxPrice: concert.maxPrice,
          currency: concert.currency || 'USD',
          sourceId,
          sourceName
        },
        update: {
          ticketStatus: concert.ticketStatus,
          ticketUrl: concert.ticketUrl,
          minPrice: concert.minPrice,
          maxPrice: concert.maxPrice,
          lastScrapedAt: new Date()
        }
      });

      processed++;
    } catch (error) {
      console.error('Failed to process concert:', error);
    }
  }

  return processed;
}

function getCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    'United States': 'US',
    'USA': 'US',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'India': 'IN',
    // Add more as needed
  };
  return countryMap[country] || country.slice(0, 2).toUpperCase();
}
```

---

## Step 4: Concert Search API

Create `app/api/concerts/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { addMonths } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const country = searchParams.get('country');
  const city = searchParams.get('city');
  const artistId = searchParams.get('artistId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const where: any = {
    date: {
      gte: dateFrom ? new Date(dateFrom) : new Date(),
      lte: dateTo ? new Date(dateTo) : addMonths(new Date(), 3)
    }
  };

  if (artistId) {
    where.artistId = artistId;
  }

  if (country || city) {
    where.venue = {};
    if (country) where.venue.countryCode = country;
    if (city) where.venue.city = { contains: city, mode: 'insensitive' };
  }

  const [concerts, total] = await Promise.all([
    db.concert.findMany({
      where,
      include: {
        venue: true,
        ticketSources: true,
        _count: {
          select: { userInteractions: true }
        }
      },
      orderBy: { date: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    db.concert.count({ where })
  ]);

  return NextResponse.json({
    concerts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
```

---

## Step 5: User Location Management API

Create `app/api/user/location/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const locations = await db.userLocation.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: 'desc' }
  });

  return NextResponse.json(locations);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { country, countryName, region, city, latitude, longitude, searchRadius, isDefault } = await request.json();

  // If setting as default, unset other defaults
  if (isDefault) {
    await db.userLocation.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false }
    });
  }

  const location = await db.userLocation.create({
    data: {
      userId: session.user.id,
      country,
      countryName,
      region,
      city,
      latitude,
      longitude,
      searchRadius: searchRadius || 100,
      isDefault: isDefault || false
    }
  });

  return NextResponse.json(location);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();

  await db.userLocation.delete({
    where: { id, userId: session.user.id }
  });

  return NextResponse.json({ success: true });
}
```

---

## Step 6: Concert Interaction API

Create `app/api/concerts/[id]/interest/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { status } = await request.json(); // 'interested' or 'going'

  const interaction = await db.userConcertInteraction.upsert({
    where: {
      userId_concertId: {
        userId: session.user.id,
        concertId: params.id
      }
    },
    create: {
      userId: session.user.id,
      concertId: params.id,
      status
    },
    update: { status }
  });

  // Update concert counts
  const counts = await db.userConcertInteraction.groupBy({
    by: ['status'],
    where: { concertId: params.id },
    _count: true
  });

  const interestedCount = counts.find(c => c.status === 'interested')?._count || 0;
  const attendingCount = counts.find(c => c.status === 'going')?._count || 0;

  await db.concert.update({
    where: { id: params.id },
    data: { interestedCount, attendingCount }
  });

  return NextResponse.json({ interaction, interestedCount, attendingCount });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.userConcertInteraction.delete({
    where: {
      userId_concertId: {
        userId: session.user.id,
        concertId: params.id
      }
    }
  });

  return NextResponse.json({ success: true });
}
```

---

## Step 7: Concert UI Components

### Concert Card Component

Create `components/concerts/ConcertCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { MapPinIcon, CalendarIcon, TicketIcon, UsersIcon } from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/solid';

interface Concert {
  id: string;
  artistName: string;
  artistImageUrl?: string;
  eventName: string;
  date: string;
  venue: {
    name: string;
    city: string;
    country: string;
  };
  ticketStatus: string;
  ticketUrl?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  interestedCount: number;
  attendingCount: number;
  userStatus?: 'interested' | 'going' | null;
}

interface ConcertCardProps {
  concert: Concert;
  onInterest: (id: string, status: string) => void;
}

export function ConcertCard({ concert, onInterest }: ConcertCardProps) {
  const [status, setStatus] = useState(concert.userStatus);

  const handleInterest = async (newStatus: 'interested' | 'going') => {
    setStatus(newStatus);
    onInterest(concert.id, newStatus);
  };

  const getStatusBadge = () => {
    switch (concert.ticketStatus) {
      case 'sold_out':
        return <span className="px-2 py-1 bg-error/20 text-error text-xs rounded-full">Sold Out</span>;
      case 'presale':
        return <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full">Presale</span>;
      case 'on_sale':
        return <span className="px-2 py-1 bg-success/20 text-success text-xs rounded-full">On Sale</span>;
      default:
        return null;
    }
  };

  const daysUntil = Math.ceil((new Date(concert.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-bg-secondary rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
      {/* Header with Artist Image */}
      <div className="relative h-32">
        <Image
          src={concert.artistImageUrl || '/default-concert.jpg'}
          alt={concert.artistName}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="font-bold text-white truncate">{concert.artistName}</h3>
          <p className="text-sm text-gray-300 truncate">{concert.eventName}</p>
        </div>
        {/* Days countdown */}
        <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded text-xs font-bold">
          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Date & Venue */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <CalendarIcon className="w-4 h-4" />
            <span>{format(new Date(concert.date), 'EEE, MMM d, yyyy • h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <MapPinIcon className="w-4 h-4" />
            <span>{concert.venue.name}, {concert.venue.city}</span>
          </div>
        </div>

        {/* Price & Status */}
        <div className="flex items-center justify-between mb-4">
          {concert.minPrice ? (
            <div className="flex items-center gap-1 text-sm">
              <TicketIcon className="w-4 h-4 text-primary" />
              <span className="text-text-primary font-medium">
                {concert.currency || '$'}{concert.minPrice}
                {concert.maxPrice && concert.maxPrice !== concert.minPrice && 
                  ` - ${concert.currency || '$'}${concert.maxPrice}`}
              </span>
            </div>
          ) : (
            <span className="text-sm text-text-secondary">Price TBA</span>
          )}
          {getStatusBadge()}
        </div>

        {/* Social Stats */}
        <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
          <div className="flex items-center gap-1">
            <HeartIcon className="w-4 h-4 text-pink-500" />
            <span>{concert.interestedCount} interested</span>
          </div>
          <div className="flex items-center gap-1">
            <UsersIcon className="w-4 h-4 text-primary" />
            <span>{concert.attendingCount} going</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleInterest('interested')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              status === 'interested'
                ? 'bg-pink-500/20 text-pink-500 border border-pink-500'
                : 'bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80'
            }`}
          >
            {status === 'interested' ? '❤️ Interested' : 'Interested'}
          </button>
          <button
            onClick={() => handleInterest('going')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              status === 'going'
                ? 'bg-primary text-white'
                : 'bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80'
            }`}
          >
            {status === 'going' ? '✓ Going' : 'Going'}
          </button>
        </div>

        {/* Ticket Link */}
        {concert.ticketUrl && concert.ticketStatus !== 'sold_out' && (
          <a
            href={concert.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-center py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Get Tickets
          </a>
        )}
      </div>
    </div>
  );
}
```

---

## Step 8: Location Search Component

Create `components/concerts/LocationSearch.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface Country {
  code: string;
  name: string;
  regions?: string[];
}

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', regions: ['California', 'New York', 'Texas', 'Florida'] },
  { code: 'GB', name: 'United Kingdom', regions: ['England', 'Scotland', 'Wales'] },
  { code: 'CA', name: 'Canada', regions: ['Ontario', 'British Columbia', 'Quebec'] },
  { code: 'AU', name: 'Australia', regions: ['New South Wales', 'Victoria', 'Queensland'] },
  { code: 'DE', name: 'Germany', regions: ['Bavaria', 'Berlin', 'Hamburg'] },
  { code: 'FR', name: 'France', regions: ['Île-de-France', 'Provence'] },
  { code: 'IN', name: 'India', regions: ['Maharashtra', 'Karnataka', 'Delhi'] },
];

interface LocationSearchProps {
  onLocationChange: (country: string, city?: string) => void;
}

export function LocationSearch({ onLocationChange }: LocationSearchProps) {
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCountrySelect = (countryCode: string) => {
    setCountry(countryCode);
    setShowDropdown(false);
    onLocationChange(countryCode, city);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCity(e.target.value);
  };

  const handleSearch = () => {
    onLocationChange(country, city);
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-4">
      <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
        <MapPinIcon className="w-5 h-5 text-primary" />
        Find Concerts Near You
      </h3>

      <div className="space-y-3">
        {/* Country Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full p-3 bg-bg-tertiary rounded-lg text-left text-text-primary flex items-center justify-between"
          >
            <span>{country ? COUNTRIES.find(c => c.code === country)?.name : 'Select Country'}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-bg-tertiary rounded-lg shadow-lg max-h-60 overflow-auto">
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => handleCountrySelect(c.code)}
                  className="w-full p-3 text-left text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* City Input */}
        <input
          type="text"
          placeholder="City (optional)"
          value={city}
          onChange={handleCityChange}
          className="w-full p-3 bg-bg-tertiary rounded-lg text-text-primary placeholder-text-muted"
        />

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={!country}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
          Search Concerts
        </button>
      </div>
    </div>
  );
}
```

---

## Step 9: Concert Discovery Page

Create `app/concerts/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { ConcertCard } from '@/components/concerts/ConcertCard';
import { LocationSearch } from '@/components/concerts/LocationSearch';
import { CalendarIcon, MapIcon, ListBulletIcon } from '@heroicons/react/24/outline';

export default function ConcertsPage() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'calendar' | 'map'>('list');
  const [filters, setFilters] = useState({
    country: '',
    city: '',
    artistId: ''
  });

  const fetchConcerts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.country) params.append('country', filters.country);
    if (filters.city) params.append('city', filters.city);
    if (filters.artistId) params.append('artistId', filters.artistId);

    const res = await fetch(`/api/concerts?${params.toString()}`);
    const data = await res.json();
    setConcerts(data.concerts);
    setLoading(false);
  };

  const handleLocationChange = (country: string, city?: string) => {
    setFilters({ ...filters, country, city: city || '' });
  };

  const handleInterest = async (concertId: string, status: string) => {
    await fetch(`/api/concerts/${concertId}/interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  };

  useEffect(() => {
    if (filters.country) {
      fetchConcerts();
    }
  }, [filters]);

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Concert Discovery</h1>
          <p className="text-text-secondary">Find upcoming shows for your favorite artists</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1 space-y-4">
            <LocationSearch onLocationChange={handleLocationChange} />

            {/* View Toggle */}
            <div className="bg-bg-secondary rounded-xl p-4">
              <h3 className="font-semibold text-text-primary mb-3">View</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setView('list')}
                  className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-1 ${
                    view === 'list' ? 'bg-primary text-white' : 'bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  <ListBulletIcon className="w-4 h-4" />
                  <span className="text-sm">List</span>
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-1 ${
                    view === 'calendar' ? 'bg-primary text-white' : 'bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-sm">Cal</span>
                </button>
                <button
                  onClick={() => setView('map')}
                  className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-1 ${
                    view === 'map' ? 'bg-primary text-white' : 'bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                  <span className="text-sm">Map</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : concerts.length === 0 ? (
              <div className="text-center py-16">
                <MapIcon className="w-16 h-16 mx-auto text-text-muted mb-4" />
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  {filters.country ? 'No concerts found' : 'Select your location'}
                </h3>
                <p className="text-text-secondary">
                  {filters.country 
                    ? 'Try expanding your search area or check back later'
                    : 'Choose a country to discover concerts in your area'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {concerts.map((concert: any) => (
                  <ConcertCard
                    key={concert.id}
                    concert={concert}
                    onInterest={handleInterest}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 10: Scraping Cron Job

Create `app/api/cron/scrape-concerts/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeArtistConcerts } from '@/lib/services/concert-scraper';
import { processConcerts } from '@/lib/services/concert-processor';

export async function GET() {
  // Get popular artists to scrape
  const topArtists = await db.userTopArtist.groupBy({
    by: ['spotifyId', 'name'],
    _count: true,
    orderBy: { _count: { spotifyId: 'desc' } },
    take: 50
  });

  let totalProcessed = 0;

  for (const artist of topArtists) {
    try {
      // Scrape for major countries
      for (const country of ['US', 'GB', 'CA', 'AU', 'DE']) {
        const concerts = await scrapeArtistConcerts(artist.name, country);
        const processed = await processConcerts(concerts, 'free_apis');
        totalProcessed += processed;
      }
    } catch (error) {
      console.error(`Failed to scrape ${artist.name}:`, error);
    }
  }

  return NextResponse.json({ 
    success: true, 
    artistsProcessed: topArtists.length,
    concertsFound: totalProcessed
  });
}
```

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/leaderboard-reset",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/scrape-concerts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## Testing Checklist

- [ ] Location search works correctly
- [ ] Concerts display for selected location
- [ ] User can mark interested/going
- [ ] Concert cards show all relevant info
- [ ] Ticket links work correctly
- [ ] Scraping job processes artists
- [ ] Concert data is deduplicated
- [ ] Map view displays markers (if implemented)
- [ ] Calendar view shows events by date

---

## Next Steps

- Implement push notifications for concert alerts
- Add social features (friends attending)
- Build concert recommendations engine
- Add calendar export functionality
