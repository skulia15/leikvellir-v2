# Sitemap Configuration

This project includes automatic sitemap generation for better SEO and search engine discoverability.

## Files Created

### `src/app/sitemap.ts`

- **Purpose**: Generates XML sitemap dynamically using Next.js 15's built-in sitemap functionality
- **URL**: Accessible at `/sitemap.xml`
- **Features**:
  - Includes all static pages (home, playgrounds listing, contact, etc.)
  - Dynamically generates entries for all approved playground detail pages
  - Sets appropriate priorities and change frequencies
  - Handles database connection errors gracefully
  - Uses environment configuration for base URL

### `src/app/robots.ts`

- **Purpose**: Generates robots.txt file for search engine crawling guidelines
- **URL**: Accessible at `/robots.txt`
- **Features**:
  - Allows crawling of public pages
  - Blocks admin routes, API endpoints, and test pages
  - References the sitemap location

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
NEXT_PUBLIC_BASE_URL="https://your-domain.com"
```

This determines the base URL used in sitemap generation. Defaults to `https://leiksvæði.is` if not set.

### Automatic Generation

The sitemap:

- **Static pages**: Always included with predefined priorities
- **Playground pages**: Generated from database queries of approved playgrounds
- **Update frequency**: Reflects actual content change patterns
- **Error handling**: Falls back to static pages only if database query fails

## URL Structure

### Static Pages (included)

- `/` - Homepage (priority: 1.0)
- `/playgrounds` - Playground listing (priority: 0.8)
- `/create-playground` - Create playground form (priority: 0.6)
- `/contact` - Contact page (priority: 0.5)
- `/privacy` - Privacy policy (priority: 0.3)
- `/cookies` - Cookie policy (priority: 0.3)

### Dynamic Pages (included)

- `/playground/[id]` - Individual playground pages (priority: 0.7)

### Excluded Pages

- `/admin/*` - Admin interfaces
- `/api/*` - API endpoints
- `/signin` - Authentication page
- Test routes

## Technical Details

- **Framework**: Next.js 15 App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Status filter**: Only includes `approved` playgrounds
- **Performance**: Database query only selects necessary fields (id, updatedAt)
- **Type safety**: Uses Next.js MetadataRoute.Sitemap type

## Benefits

1. **SEO Improvement**: Search engines can efficiently discover and index all playground pages
2. **Dynamic Updates**: New approved playgrounds automatically appear in sitemap
3. **Proper Prioritization**: Important pages get higher priority scores
4. **Change Frequency**: Helps search engines understand update patterns
5. **Error Resilience**: Continues working even if database is temporarily unavailable

## Monitoring

The sitemap can be monitored through:

- Google Search Console sitemap submission
- Direct access at `your-domain.com/sitemap.xml`
- Server logs for generation errors
