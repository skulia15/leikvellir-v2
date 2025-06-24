# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `pnpm dev` - Start development server with Turbo (recommended)
- `pnpm dev:fallback` - Start development server without Turbo
- `pnpm build` - Build production application
- `pnpm start` - Start production server

### Database Operations
- `pnpm db:push` - Push schema changes to database (development)
- `pnpm db:migrate` - Run database migrations
- `pnpm db:generate` - Generate database migration files
- `pnpm db:studio` - Open Drizzle Studio for database management

### Testing
- `pnpm test` - Run tests with Vitest
- `pnpm test:ui` - Run tests with Vitest UI
- `pnpm test:run` - Run tests once (CI mode)
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

### Code Quality
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

### Utility
- `pnpm clean` - Clean build artifacts and cache
- `pnpm postbuild` - Automatically runs `db:push --force` after build

## Project Architecture

### Tech Stack
This is a **T3 Stack** application built with:
- **Next.js 15** (App Router) - React framework
- **TypeScript** - Type-safe development
- **tRPC** - End-to-end type-safe APIs
- **Drizzle ORM** - TypeScript-first ORM
- **PostgreSQL** - Primary database
- **NextAuth.js** - Authentication
- **Tailwind CSS** - Styling
- **Radix UI + shadcn/ui** - UI components

### Core Application Structure

**Leiksvæði** is a playground discovery application for Iceland that allows users to find, submit, and manage playground information with location-based features.

#### Key Features
- **Interactive Maps**: Google Maps integration with location-based search
- **Playground Database**: Comprehensive playground details with images, equipment, and accessibility info
- **User Authentication**: NextAuth.js with Discord OAuth and mock authentication for development
- **Admin System**: Role-based access control (user, admin, super_admin)
- **Multilingual Support**: Icelandic (default), English, and Polish translations
- **Image Management**: Vercel Blob storage for playground images
- **Equipment System**: Categorized playground equipment with multilingual names

#### Database Schema Overview
- **playgrounds**: Core playground data with location, accessibility, amenities
- **equipment**: Playground equipment types with categories and multilingual names
- **playgroundEquipment**: Many-to-many relationship between playgrounds and equipment
- **playgroundEditSuggestions**: User-submitted edit suggestions for existing playgrounds
- **users**: User accounts with role-based permissions
- **NextAuth tables**: Standard authentication tables (accounts, sessions, etc.)

#### API Structure (tRPC)
- **playground router**: CRUD operations, submissions, reviews, location queries
- **equipment router**: Equipment management and queries
- **users router**: User management and role administration

### Directory Structure

#### Frontend (`src/app/`)
- **_components/**: Shared React components (maps, forms, UI elements)
- **admin/**: Admin panel pages and components
- **api/**: Next.js API routes (auth, upload, municipalities)
- **playground/[id]/**: Dynamic playground detail pages
- **playgrounds/**: Playground listing pages

#### Backend (`src/server/`)
- **api/**: tRPC routers and procedures
- **auth.ts**: NextAuth.js configuration
- **db/**: Database schema and connection

#### Shared (`src/`)
- **components/ui/**: shadcn/ui components
- **lib/**: Utilities, hooks, and shared logic
- **locales/**: Translation files (is.json, en.json, pl.json)
- **types.ts**: Shared TypeScript types

### Authentication Setup

#### Development Mode
Enable mock authentication with:
```bash
./enable-mock-auth.sh
# or manually add to .env:
ENABLE_MOCK_AUTH=true
```

Mock users available:
- Skúli Arnarsson (skuli@example.com)
- Jane Parent (jane@example.com) 
- John Playground Expert (john@example.com)

#### Production Mode
Requires Discord OAuth credentials in environment variables.

### Environment Variables
Key variables needed:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `NEXT_PUBLIC_BASE_URL` - Production domain (for SEO/sitemap)
- `ENABLE_MOCK_AUTH` - Enable mock auth for development

### Testing Configuration
- **Vitest** for unit/integration tests
- **Testing Library** for React component testing
- **MSW** for API mocking
- **jsdom** environment for browser simulation

### Key Development Notes

#### Internationalization
- Uses custom i18n system with React Context
- Translation keys in `src/locales/*.json`
- Supports pluralization with `_one`, `_other` suffixes
- Use `useTranslation()` hook and `t()` function

#### Database Migrations
- Use Drizzle Kit for schema management
- Migration files in `drizzle/` directory
- Always run `pnpm db:push` for development changes
- Use `pnpm db:migrate` for production deployments

#### Image Handling
- Vercel Blob for image storage
- Client-side image validation and resizing
- Support for cover images and image galleries
- Proper loading states and error handling

#### Performance Considerations
- PostHog analytics with deferred loading
- Image optimization with proper loading strategies
- Font loading optimization with display=swap
- Critical resource preconnection

### Common Workflows

1. **Adding New Features**: Update database schema → create migrations → implement tRPC procedures → build frontend components
2. **Fixing Bugs**: Check both client and server logs → identify root cause → implement fix → test across devices
3. **Translation Updates**: Add keys to all language files → test in all languages → verify pluralization
4. **Database Changes**: Update schema.ts → generate migration → test migration → deploy

### Development Environment Setup
1. Install dependencies: `pnpm install`
2. Set up environment variables (copy `.env.example`)
3. Start database (use provided scripts)
4. Run migrations: `pnpm db:push`
5. Start development server: `pnpm dev`

### Deployment Notes
- Hosted on Vercel with PostgreSQL database
- Automatic migrations run via `postbuild` script
- Environment variables must be set in Vercel dashboard
- Sitemap and SEO optimization configured for production domain