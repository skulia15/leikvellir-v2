# Leiksvæði 🏞️

**Live: [leiksvæði.is](https://xn--leiksvi-rxa4g.is)**

A modern web application for discovering and mapping playgrounds in Iceland. Built with the T3 Stack, Leiksvæði helps parents and families find the perfect playground for their children with detailed information about accessibility, age-appropriateness, and location data.

## 🚀 Features

### ✅ Implemented

- **Interactive Map**: Google Maps/Mapbox integration showing playground locations
  - Color-coded markers (green for regular, amber/red for school grounds based on accessibility)
  - User location with animated indicator
  - Marker clustering for zoomed-out views
- **Playground Database**: Comprehensive playground information including:
  - Location coordinates (latitude/longitude)
  - Accessibility status
  - Toddler-friendly indicators
  - Image support (cover image + gallery)
  - Equipment tracking with categories
  - Amenities (seating, picnic tables, fencing, shade, etc.)
- **User Authentication**: Secure login system using NextAuth.js
- **Mock Authentication**: Development mode with test users (no OAuth setup required)
- **User Management System**: Complete role-based access control
  - User roles: `user`, `admin`, `super_admin`
  - Auto-promotion of first user to super admin
  - Admin can ban/unban users with reasons
  - Super admin can promote/demote user roles
  - Permission-based UI and API access
- **Admin Panel**: Comprehensive administration interface
  - User management dashboard (super admin only)
  - Playground review and approval system
  - Edit suggestion review system
  - Role-based navigation and features
  - Admin mode toggle with persistent state
- **Image Upload System**: File upload functionality for playgrounds
  - Multiple image support per playground
  - Admin cover image selection during review
  - Drag-and-drop interface with validation
  - Client-side image compression for large files
  - Image removal during upload
- **Playground Submission System**: Public submission with admin approval
  - Form validation with React Hook Form + Zod
  - Status tracking (pending, approved, rejected)
  - Admin review with edit capabilities
  - Rejection reasons and feedback
- **Edit Suggestion System**: Users can suggest changes to existing playgrounds
  - Full edit form for all playground properties
  - Equipment and image change suggestions
  - Admin review with side-by-side comparison
  - Reviewer can modify suggestions before approval
- **Type-Safe API**: End-to-end type safety with tRPC
- **Form Validation**: React Hook Form with Zod validation
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Database Migrations**: Automated schema management with Drizzle
- **Location Features**:
  - List nearby playgrounds by distance from user location
  - GPS-based location search
  - Filter by distance from user
  - Map auto-centers on user location when permitted
- **Filtering & Search**:
  - Filter by age group (toddler-friendly)
  - Filter by equipment categories
  - Filter by accessibility
- **Navigation**: Google Maps directions integration
- **Multi-language Support**: Icelandic, English, and Polish
- **Cloud Storage**: Images stored in cloud storage
- **Analytics**: PostHog integration for traffic tracking
- **SEO**: Metadata, structured data, sitemap, and OG image generation
- **Playground Details**:
  - Comprehensive detail pages
  - Equipment lists with categories
  - Municipality information (from Þjóðskrá API)
  - Badge icons for toddler-friendly and public access
  - Animated list transitions

### 🚧 In Progress

**Bugs & Fixes**
- Location cache issue in playground review - old coordinates shown when opening next playground after review
- Test and fix edit suggestion review dialog edge cases
- Verify location changes in edit review work correctly (user suggested location vs admin-set location)
- Fix playground equipment list display on detail pages

**UI/UX Improvements**
- Add back buttons to contact page, playground page, and others with consistent navigation
- Mobile layout review and fixes
- Filter view layout improvements
- Sidebar sizing on non-mobile devices
- Playground list cards need more info (school ground status, etc.)
- Standardized sizing of playgrounds in list view
- Reduce carousel size in mobile detail page
- Loading skeletons for remaining pages
- Disable submit button while images are uploading

**Map Enhancements**
- Enhanced markers for different playground types (ball courts, preschool, elementary school)
- Specific icons and colors for ball courts (football, basketball, tennis)

**Admin Features**
- Playground review should display all playground properties
- Submissions should display user names instead of IDs

**Infrastructure**
- Setup separate dev and production databases
- Performance optimizations (Lighthouse)

**Notifications**
- Email notification when new playground is submitted
- Notify users when their submission is approved/rejected

### 📋 Planned Features

**Technical Debt**
- Use tRPC effectively in backend with shared type definitions
- Use Drizzle type inference for base types
- Websocket for real-time location tracking

**Image Improvements**
- Better image optimization using Cloudinary
- Progressive image loading with blur-up effect

**Accessibility**
- Wheelchair accessibility checkbox and detail page display
- School hours enhancement with holidays
- Filter by "accessible now" (school ground time-based accessibility)

**Enhanced Playground Details**
- AI-Vision to determine equipment types from uploaded photos

**Community Features**
- User-contributed playground reviews and ratings
- Check-in system for playgrounds
- Star rating system

**Reporting System**
- Playground issue reporting (broken equipment, safety hazards)
- Direct submission to municipality (starting with Hafnarfjörður)
- Image attachments for reports

**Advanced Features**
- Sort by rating or other criteria
- Include football, basketball, tennis courts as separate category
- Event listings and calendar integration
- Audit trail for edit suggestions vs approved changes

**Technical Improvements**
- Dark theme support
- Production monitoring with Sentry
- Automated image optimization and thumbnails
- SVG boundary overlay on map
- Test/demo instance with admin privileges for all users
- Improve feedback form (use mailing service instead of mailto links)

## 🛠️ Tech Stack

This project uses the **T3 Stack** - a modern, type-safe full-stack TypeScript framework:

### Core Technologies

- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[TypeScript](https://typescriptlang.org)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[tRPC](https://trpc.io)** - End-to-end type-safe APIs
- **[Drizzle ORM](https://orm.drizzle.team)** - TypeScript ORM
- **[NextAuth.js](https://next-auth.js.org)** - Authentication
- **[PostgreSQL](https://postgresql.org)** - Database

### UI & Components

- **[Radix UI](https://radix-ui.com)** - Unstyled, accessible components
- **[shadcn/ui](https://ui.shadcn.com)** - Beautiful component library
- **[Lucide React](https://lucide.dev)** - Icon library
- **[react-google-maps](https://vis.gl/react-google-maps)** - Google Maps integration
- **[React Hook Form](https://react-hook-form.com)** - Performant forms with validation

### Development Tools

- **[PNPM](https://pnpm.io)** - Fast, disk space efficient package manager
- **[ESLint](https://eslint.org)** - Code linting
- **[Prettier](https://prettier.io)** - Code formatting
- **[Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)** - Database migrations

## 🏃‍♂️ Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **PNPM** package manager
- **PostgreSQL** database
- **Google Maps API key**

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd leikvellir-v2
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in your environment variables:

   ```env
   DATABASE_URL="postgresql://..."
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-key"

   # For production, add Discord OAuth credentials:
   # DISCORD_CLIENT_ID="your-discord-client-id"
   # DISCORD_CLIENT_SECRET="your-discord-client-secret"
   ```

4. **Start the database**

   ```bash
   ./start-database.sh  # From WSL
   ```

5. **Run database migrations**

   For local development prototyping:

   ```bash
   pnpm db:push
   ```

   For staging and production, generate and apply versioned SQL migrations explicitly (migrations are **not** run automatically during `pnpm build`):

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

6. **Start development server**
   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── _components/        # Reusable components
│   ├── api/               # API routes
│   ├── home/              # Home page (main app)
│   └── create-playground/ # Playground creation
├── components/ui/         # shadcn/ui components
├── lib/                   # Utilities
├── server/               # Server-side code
│   ├── api/             # tRPC routers
│   ├── auth.ts          # Authentication config
│   └── db/              # Database schema & connection
├── styles/              # Global styles
├── trpc/               # tRPC client configuration
└── types.ts            # TypeScript type definitions
```

## 🗄️ Database Schema

The application uses a PostgreSQL database with the following main entities:

- **playgrounds** - Core playground data with location, accessibility info
- **users** - User accounts via NextAuth
- **posts** - Example entity from T3 template
- **accounts/sessions** - NextAuth authentication tables

## 🚀 Deployment

The app is ready for deployment on:

- **[Production](https://leiksvæði.is)**
- **[Vercel](https://leikvellir-v2.vercel.app)**

## 🤝 Contributing

This is currently a personal project, but contributions and suggestions are welcome! Feel free to:

1. Report bugs or issues
2. Suggest new features
3. Submit pull requests

## 📄 License

This project is private and intended for personal use.

## 🏗️ Architecture Notes

### Why T3 Stack?

- **Type Safety**: End-to-end TypeScript ensures fewer runtime errors
- **Developer Experience**: Excellent tooling and fast development cycle
- **Performance**: Server-side rendering and optimized builds
- **Scalability**: Production-ready architecture from day one

### Database Choice: Drizzle vs Prisma

- **Bundle Size**: Drizzle has zero runtime dependencies
- **Performance**: Closer to SQL, more predictable queries
- **TypeScript Integration**: Native TypeScript support
- **Learning**: Better understanding of SQL concepts

---

_Built by Skúli Arnarsson in Hafnarfjörður, Iceland_
