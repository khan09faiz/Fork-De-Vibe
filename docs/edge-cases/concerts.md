# Edge Cases: Concert Discovery System

**Purpose:** Handle edge cases in concert scraping, search, and user interactions

---

## Web Scraping Edge Cases

### 1. Scraping Source Unavailable

**Problem:** Primary concert data source is down or blocking requests

```typescript
// Multi-source fallback strategy
interface ScrapingFallback {
  sources: ScrapingSource[];
  currentSourceIndex: number;
  
  async scrapeWithFallback(artistName: string, location: string): Promise<Concert[]> {
    for (const source of this.sources) {
      try {
        const result = await this.scrapeSource(source, artistName, location);
        if (result.concerts.length > 0) {
          return result.concerts;
        }
      } catch (error) {
        console.warn(`Source ${source.name} failed:`, error);
        await this.recordSourceFailure(source.name);
        continue; // Try next source
      }
    }
    
    // All sources failed - return cached data with warning
    return this.getCachedConcerts(artistName, location, { stale: true });
  }
  
  // Circuit breaker pattern
  async recordSourceFailure(sourceName: string) {
    const failures = await cache.incr(`failures:${sourceName}`);
    await cache.expire(`failures:${sourceName}`, 3600); // 1 hour window
    
    if (failures >= 5) {
      await cache.set(`circuit_open:${sourceName}`, true, 1800); // 30 min cooldown
      console.error(`Circuit breaker opened for ${sourceName}`);
    }
  }
}
```

### 2. Rate Limiting from Sources

**Problem:** Scraping sources return 429 (Too Many Requests)

```typescript
interface RateLimitHandler {
  // Exponential backoff
  async handleRateLimit(source: string, retryAfter?: number): Promise<void> {
    const backoffKey = `backoff:${source}`;
    const currentBackoff = (await cache.get(backoffKey)) || 1;
    
    const waitTime = retryAfter || Math.min(currentBackoff * 2, 300); // Max 5 minutes
    
    await cache.set(backoffKey, waitTime, 3600);
    await delay(waitTime * 1000);
  }
  
  // Request queuing
  async queueRequest(source: string, request: ScrapingRequest): Promise<void> {
    const queue = await getSourceQueue(source);
    const rateLimit = SOURCE_RATE_LIMITS[source] || 10; // requests per minute
    
    // Wait for available slot
    while (queue.length >= rateLimit) {
      await delay(1000);
    }
    
    queue.push(request);
    setTimeout(() => queue.shift(), 60000); // Remove after 1 minute
  }
}
```

### 3. Inconsistent Data Formats

**Problem:** Different sources provide data in different formats

```typescript
interface DataNormalizer {
  // Normalize venue names
  normalizeVenueName(name: string, source: string): string {
    // Remove common suffixes
    let normalized = name
      .replace(/\s*(Arena|Stadium|Theatre|Theater|Amphitheatre|Amphitheater)$/i, '')
      .trim();
    
    // Handle source-specific quirks
    if (source === 'ticketmaster') {
      normalized = normalized.replace(/^The\s+/i, '');
    }
    
    return normalized;
  }
  
  // Normalize dates across timezones
  normalizeDate(dateStr: string, timezone: string, source: string): Date {
    // Different sources use different formats
    const formats: Record<string, string> = {
      'bandsintown': 'YYYY-MM-DDTHH:mm:ss',
      'songkick': 'YYYY-MM-DD',
      'ticketmaster': 'YYYY-MM-DDTHH:mm:ssZ'
    };
    
    return parseDate(dateStr, formats[source] || 'ISO', timezone);
  }
  
  // Normalize ticket status
  normalizeTicketStatus(status: string, source: string): TicketStatus {
    const statusMap: Record<string, Record<string, TicketStatus>> = {
      'bandsintown': {
        'tickets_available': 'on_sale',
        'sold_out': 'sold_out',
        'none': 'not_yet_announced'
      },
      'ticketmaster': {
        'onsale': 'on_sale',
        'presale': 'presale',
        'offsale': 'sold_out'
      }
    };
    
    return statusMap[source]?.[status.toLowerCase()] || 'on_sale';
  }
}
```

### 4. Duplicate Concert Detection

**Problem:** Same concert appears from multiple sources

```typescript
interface DuplicateDetector {
  async findDuplicates(concerts: Concert[]): Promise<Concert[][]> {
    const groups: Concert[][] = [];
    const processed = new Set<string>();
    
    for (const concert of concerts) {
      if (processed.has(concert.id)) continue;
      
      const duplicates = concerts.filter(c => 
        c.id !== concert.id &&
        !processed.has(c.id) &&
        this.areLikelyDuplicates(concert, c)
      );
      
      if (duplicates.length > 0) {
        const group = [concert, ...duplicates];
        groups.push(group);
        group.forEach(c => processed.add(c.id));
      }
    }
    
    return groups;
  }
  
  areLikelyDuplicates(a: Concert, b: Concert): boolean {
    // Same artist, same date
    if (a.artistName.toLowerCase() !== b.artistName.toLowerCase()) return false;
    if (!isSameDay(a.date, b.date)) return false;
    
    // Same city
    if (a.venue.city.toLowerCase() !== b.venue.city.toLowerCase()) return false;
    
    // Similar venue name (fuzzy match)
    const venueSimilarity = stringSimilarity(
      this.normalizeVenueName(a.venue.name),
      this.normalizeVenueName(b.venue.name)
    );
    
    return venueSimilarity > 0.7;
  }
  
  // Merge duplicates, preferring official sources
  mergeDuplicates(duplicates: Concert[]): Concert {
    // Sort by source priority
    const sorted = duplicates.sort((a, b) => 
      SOURCE_PRIORITY[a.sourceName] - SOURCE_PRIORITY[b.sourceName]
    );
    
    const primary = sorted[0];
    
    // Merge ticket sources from all duplicates
    const allTicketSources = duplicates.flatMap(c => c.ticketSources);
    const uniqueTicketSources = dedupeBy(allTicketSources, 'name');
    
    return {
      ...primary,
      ticketSources: uniqueTicketSources,
      sourceIds: duplicates.map(c => ({ source: c.sourceName, id: c.sourceId }))
    };
  }
}
```

### 5. Incorrect or Outdated Data

**Problem:** Scraped data is wrong or outdated (cancelled events still showing)

```typescript
interface DataValidation {
  // Validate scraped concert data
  async validateConcert(concert: Concert): Promise<ValidationResult> {
    const issues: string[] = [];
    
    // Check if date is in the past
    if (concert.date < new Date()) {
      issues.push('past_date');
    }
    
    // Check for suspicious data patterns
    if (concert.minPrice && concert.minPrice < 1) {
      issues.push('suspicious_price');
    }
    
    // Cross-reference with other sources
    const crossRef = await this.crossReferenceCheck(concert);
    if (!crossRef.confirmed) {
      issues.push('not_confirmed_elsewhere');
    }
    
    // Check venue exists
    const venueExists = await this.validateVenue(concert.venue);
    if (!venueExists) {
      issues.push('invalid_venue');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      confidence: this.calculateConfidence(issues)
    };
  }
  
  // Periodic data freshness check
  async refreshStaleData() {
    const staleConcerts = await db.concert.findMany({
      where: {
        lastScrapedAt: { lt: subHours(new Date(), 24) },
        date: { gte: new Date() }
      }
    });
    
    for (const concert of staleConcerts) {
      await this.queueRefresh(concert.id);
    }
  }
}
```

---

## Location Search Edge Cases

### 6. Ambiguous Location Names

**Problem:** City names exist in multiple countries/states

```typescript
interface LocationResolver {
  async resolveLocation(query: string): Promise<LocationResult[]> {
    // Search for matches
    const matches = await geocodingService.search(query);
    
    if (matches.length === 0) {
      return [{
        error: 'location_not_found',
        suggestion: 'Try adding a state/country (e.g., "Paris, France")'
      }];
    }
    
    if (matches.length === 1) {
      return matches;
    }
    
    // Multiple matches - ask user to clarify
    return {
      ambiguous: true,
      options: matches.map(m => ({
        displayName: `${m.city}, ${m.region || ''}, ${m.country}`,
        ...m
      }))
    };
  }
  
  // Common ambiguous cities
  const AMBIGUOUS_CITIES = [
    { name: 'Paris', countries: ['France', 'United States (Texas)'] },
    { name: 'London', countries: ['United Kingdom', 'Canada (Ontario)'] },
    { name: 'Sydney', countries: ['Australia', 'Canada'] },
    { name: 'Richmond', countries: ['United States (many states)'] }
  ];
}
```

### 7. No Concerts in Area

**Problem:** User's location has no upcoming concerts

```typescript
interface EmptyResultsHandler {
  async handleNoConcerts(location: UserLocation, artistIds: string[]): Promise<SuggestedAction[]> {
    const suggestions: SuggestedAction[] = [];
    
    // Suggest expanding radius
    const expandedResults = await searchConcerts({
      ...location,
      radius: location.searchRadius * 2
    });
    
    if (expandedResults.length > 0) {
      suggestions.push({
        type: 'expand_radius',
        message: `Found ${expandedResults.length} concerts within ${location.searchRadius * 2}km`,
        action: 'Expand Search'
      });
    }
    
    // Suggest nearby major cities
    const nearbyCities = await findNearbyCities(location, 500);
    for (const city of nearbyCities) {
      const cityResults = await searchConcerts({ city });
      if (cityResults.length > 0) {
        suggestions.push({
          type: 'try_city',
          message: `${cityResults.length} concerts in ${city.name} (${city.distance}km away)`,
          action: `Search ${city.name}`
        });
      }
    }
    
    // Suggest setting up alerts
    suggestions.push({
      type: 'set_alert',
      message: 'Get notified when concerts are announced in your area',
      action: 'Enable Notifications'
    });
    
    return suggestions;
  }
}
```

### 8. International Location Handling

**Problem:** Users searching across country boundaries

```typescript
interface InternationalSearch {
  // Handle cross-border searches (e.g., searching from Windsor, Canada should include Detroit, USA)
  async searchWithBorderCrossing(location: UserLocation): Promise<Concert[]> {
    const results: Concert[] = [];
    
    // Search primary country
    results.push(...await searchConcerts(location));
    
    // Check for nearby border
    const nearbyCountries = await findNearbyCountries(location, location.searchRadius);
    
    for (const country of nearbyCountries) {
      const foreignResults = await searchConcerts({
        ...location,
        country: country.code
      });
      
      results.push(...foreignResults.map(c => ({
        ...c,
        isCrossBorder: true,
        requiresTravel: true,
        travelInfo: {
          fromCountry: location.country,
          toCountry: country.code,
          estimatedDistance: country.distance
        }
      })));
    }
    
    return results;
  }
  
  // Currency conversion for prices
  async convertPrices(concerts: Concert[], targetCurrency: string): Promise<Concert[]> {
    const rates = await getExchangeRates();
    
    return concerts.map(c => {
      if (c.currency === targetCurrency) return c;
      
      const rate = rates[c.currency]?.[targetCurrency];
      if (!rate) return c;
      
      return {
        ...c,
        displayPrice: {
          original: { amount: c.minPrice, currency: c.currency },
          converted: { amount: c.minPrice * rate, currency: targetCurrency }
        }
      };
    });
  }
}
```

---

## Event Status Edge Cases

### 9. Cancelled or Postponed Events

**Problem:** Events get cancelled or rescheduled

```typescript
interface EventStatusHandler {
  async handleStatusChange(concertId: string, newStatus: string) {
    const concert = await db.concert.findUnique({
      where: { id: concertId },
      include: { userInteractions: true }
    });
    
    if (newStatus === 'cancelled') {
      // Update concert status
      await db.concert.update({
        where: { id: concertId },
        data: { 
          ticketStatus: 'cancelled',
          cancellationReason: 'Artist cancelled',
          cancelledAt: new Date()
        }
      });
      
      // Notify all interested/going users
      for (const interaction of concert.userInteractions) {
        await sendNotification(interaction.userId, {
          type: 'concert_cancelled',
          title: 'Concert Cancelled',
          message: `${concert.artistName} at ${concert.venue.name} has been cancelled`,
          concertId
        });
      }
    }
    
    if (newStatus === 'postponed') {
      // Mark as postponed, keep showing but with warning
      await db.concert.update({
        where: { id: concertId },
        data: {
          ticketStatus: 'postponed',
          originalDate: concert.date,
          date: null, // Unknown new date
          postponedAt: new Date()
        }
      });
      
      // Notify users
      for (const interaction of concert.userInteractions) {
        await sendNotification(interaction.userId, {
          type: 'concert_postponed',
          title: 'Concert Postponed',
          message: `${concert.artistName} has been postponed. New date TBA.`,
          concertId
        });
      }
    }
  }
  
  // Detect status changes during refresh
  async detectStatusChanges(oldConcert: Concert, newData: ScrapedConcert): Promise<StatusChange[]> {
    const changes: StatusChange[] = [];
    
    // Date changed
    if (oldConcert.date && newData.date && !isSameDay(oldConcert.date, newData.date)) {
      changes.push({
        type: 'date_changed',
        oldValue: oldConcert.date,
        newValue: newData.date
      });
    }
    
    // Ticket status changed
    if (oldConcert.ticketStatus !== newData.ticketStatus) {
      changes.push({
        type: 'ticket_status_changed',
        oldValue: oldConcert.ticketStatus,
        newValue: newData.ticketStatus
      });
    }
    
    // Price changed significantly (>20%)
    if (oldConcert.minPrice && newData.minPrice) {
      const priceChange = Math.abs(newData.minPrice - oldConcert.minPrice) / oldConcert.minPrice;
      if (priceChange > 0.2) {
        changes.push({
          type: 'price_changed',
          oldValue: oldConcert.minPrice,
          newValue: newData.minPrice,
          direction: newData.minPrice > oldConcert.minPrice ? 'increased' : 'decreased'
        });
      }
    }
    
    return changes;
  }
}
```

### 10. Sold Out Events

**Problem:** Event sold out, but resale tickets available

```typescript
interface SoldOutHandler {
  async handleSoldOut(concertId: string) {
    // Check for resale options
    const resaleTickets = await checkResaleMarkets(concertId);
    
    if (resaleTickets.length > 0) {
      await db.concert.update({
        where: { id: concertId },
        data: {
          ticketStatus: 'resale_only',
          ticketSources: {
            create: resaleTickets.map(t => ({
              name: t.marketplace,
              url: t.url,
              minPrice: t.minPrice,
              maxPrice: t.maxPrice,
              isOfficial: false,
              availability: 'available'
            }))
          }
        }
      });
    }
    
    // Notify waitlisted users
    const waitlistedUsers = await db.userConcertInteraction.findMany({
      where: {
        concertId,
        status: 'interested',
        notifyOnAvailability: true
      }
    });
    
    if (resaleTickets.length > 0) {
      for (const user of waitlistedUsers) {
        await sendNotification(user.userId, {
          type: 'resale_available',
          title: 'Resale Tickets Available',
          message: `Resale tickets found for ${concert.artistName}`,
          startingPrice: resaleTickets[0].minPrice
        });
      }
    }
  }
}
```

---

## User Interaction Edge Cases

### 11. Timezone Display Issues

**Problem:** Events shown in wrong timezone for user

```typescript
interface TimezoneHandler {
  // Always store in venue's local timezone
  storeEventTime(eventDate: Date, venueTimezone: string): StoredDateTime {
    return {
      utc: eventDate.toISOString(),
      local: formatInTimeZone(eventDate, venueTimezone, "yyyy-MM-dd'T'HH:mm:ss"),
      timezone: venueTimezone,
      offset: getTimezoneOffset(venueTimezone)
    };
  }
  
  // Display in user's preferred format
  displayEventTime(
    storedTime: StoredDateTime,
    userTimezone: string,
    format: 'local' | 'venue' | 'both'
  ): DisplayedDateTime {
    const venueTime = storedTime.local;
    const userTime = formatInTimeZone(
      new Date(storedTime.utc),
      userTimezone,
      "yyyy-MM-dd'T'HH:mm:ss"
    );
    
    switch (format) {
      case 'local':
        return { primary: userTime, secondary: null };
      case 'venue':
        return { primary: venueTime, secondary: null };
      case 'both':
        return { 
          primary: venueTime,
          secondary: userTimezone !== storedTime.timezone ? userTime : null,
          note: userTimezone !== storedTime.timezone 
            ? `${formatTimeDiff(venueTime, userTime)} your time`
            : null
        };
    }
  }
  
  // Handle DST transitions
  handleDSTTransition(eventDate: Date, timezone: string): DSTWarning | null {
    const dstTransition = getNextDSTTransition(eventDate, timezone);
    
    if (dstTransition && Math.abs(eventDate - dstTransition) < 24 * 60 * 60 * 1000) {
      return {
        warning: true,
        message: 'Note: Daylight saving time changes near this event date',
        transition: dstTransition
      };
    }
    
    return null;
  }
}
```

### 12. Reminder Delivery Failures

**Problem:** Push notification or email fails to deliver

```typescript
interface ReminderDelivery {
  async sendReminder(reminder: ConcertReminder): Promise<DeliveryResult> {
    const results: DeliveryAttempt[] = [];
    
    // Try push notification first
    try {
      await sendPushNotification(reminder.userId, reminder);
      results.push({ channel: 'push', success: true });
    } catch (error) {
      results.push({ channel: 'push', success: false, error: error.message });
    }
    
    // Always send email as backup for important reminders
    if (reminder.reminderType === 'event_tomorrow') {
      try {
        await sendEmail(reminder.userId, reminder);
        results.push({ channel: 'email', success: true });
      } catch (error) {
        results.push({ channel: 'email', success: false, error: error.message });
      }
    }
    
    // If all channels failed, queue for retry
    if (results.every(r => !r.success)) {
      await queueForRetry(reminder, { maxRetries: 3, backoff: 'exponential' });
    }
    
    // Log delivery status
    await db.reminderDelivery.create({
      data: {
        reminderId: reminder.id,
        attempts: results,
        delivered: results.some(r => r.success)
      }
    });
    
    return { delivered: results.some(r => r.success), attempts: results };
  }
}
```

---

## Performance Edge Cases

### 13. Large Result Sets

**Problem:** Search returns thousands of concerts

```typescript
interface PaginationHandler {
  // Efficient pagination with cursor-based approach
  async searchConcerts(params: SearchParams): Promise<PaginatedResult> {
    const { cursor, limit = 20 } = params;
    
    const concerts = await db.concert.findMany({
      where: buildWhereClause(params),
      take: limit + 1, // Fetch one extra to check if there's more
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ date: 'asc' }, { id: 'asc' }]
    });
    
    const hasMore = concerts.length > limit;
    const results = hasMore ? concerts.slice(0, -1) : concerts;
    const nextCursor = hasMore ? results[results.length - 1].id : null;
    
    return {
      concerts: results,
      pagination: {
        hasMore,
        nextCursor,
        totalEstimate: await getEstimatedCount(params) // Approximate count
      }
    };
  }
  
  // Virtual scrolling support for map view
  async getConcertsInViewport(bounds: MapBounds): Promise<Concert[]> {
    const MAX_MARKERS = 100;
    
    const concerts = await db.concert.findMany({
      where: {
        venue: {
          latitude: { gte: bounds.south, lte: bounds.north },
          longitude: { gte: bounds.west, lte: bounds.east }
        },
        date: { gte: new Date() }
      },
      take: MAX_MARKERS,
      orderBy: { interestedCount: 'desc' } // Show most popular first
    });
    
    // If too many, cluster by proximity
    if (concerts.length >= MAX_MARKERS) {
      return clusterConcerts(concerts, bounds.zoomLevel);
    }
    
    return concerts;
  }
}
```

### 14. Scraping Job Failures

**Problem:** Scraping job fails midway

```typescript
interface JobRecovery {
  async handleJobFailure(jobId: string, error: Error) {
    const job = await db.scrapingJob.findUnique({ where: { id: jobId } });
    
    // Record failure
    await db.scrapingJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errors: [...(job.errors || []), {
          message: error.message,
          timestamp: new Date(),
          stack: error.stack
        }],
        failedAt: new Date()
      }
    });
    
    // Retry logic
    if (job.retryCount < 3) {
      const backoff = Math.pow(2, job.retryCount) * 60 * 1000; // Exponential backoff
      
      await db.scrapingJob.update({
        where: { id: jobId },
        data: {
          status: 'pending',
          retryCount: job.retryCount + 1,
          scheduledFor: new Date(Date.now() + backoff)
        }
      });
      
      console.log(`Job ${jobId} scheduled for retry in ${backoff / 1000}s`);
    } else {
      // Max retries exceeded - alert admin
      await sendAdminAlert({
        type: 'scraping_job_failed',
        jobId,
        message: `Scraping job failed after 3 retries: ${error.message}`
      });
    }
  }
  
  // Checkpoint-based recovery for long jobs
  async saveCheckpoint(jobId: string, progress: JobProgress) {
    await db.scrapingJob.update({
      where: { id: jobId },
      data: {
        checkpoint: {
          lastProcessedArtist: progress.currentArtistId,
          concertsFound: progress.concertsFound,
          processedCount: progress.processedCount,
          timestamp: new Date()
        }
      }
    });
  }
  
  async resumeFromCheckpoint(jobId: string) {
    const job = await db.scrapingJob.findUnique({ where: { id: jobId } });
    
    if (job.checkpoint) {
      return {
        startFrom: job.checkpoint.lastProcessedArtist,
        previousProgress: job.checkpoint
      };
    }
    
    return { startFrom: null, previousProgress: null };
  }
}
```

---

## Quick Reference

| Edge Case | Solution | Priority |
|-----------|----------|----------|
| Source unavailable | Multi-source fallback + circuit breaker | Critical |
| Rate limiting | Exponential backoff + request queuing | Critical |
| Inconsistent data | Normalization layer | High |
| Duplicate concerts | Fuzzy matching + merge strategy | High |
| Outdated data | Validation + freshness checks | High |
| Ambiguous location | User disambiguation prompt | Medium |
| No results in area | Expansion suggestions + alerts | Medium |
| Cross-border search | Multi-country search with travel info | Medium |
| Cancelled events | Status tracking + user notifications | Critical |
| Sold out events | Resale market checking | Medium |
| Timezone issues | Store venue TZ, display user TZ | High |
| Reminder failures | Multi-channel delivery + retries | High |
| Large result sets | Cursor pagination + clustering | Medium |
| Job failures | Checkpointing + retry logic | High |
