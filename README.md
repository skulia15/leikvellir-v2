# Leikvellir v2 🏞️

A modern web application for discovering and mapping playgrounds in Iceland. Built with the T3 Stack, Leikvellir helps parents and families find the perfect playground for their children with detailed information about accessibility, age-appropriateness, and location data.

## 🚀 Features

### ✅ Implemented

- **Interactive Map**: Google Maps integration showing playground locations
- **Playground Database**: Comprehensive playground information including:
  - Location coordinates (latitude/longitude)
  - Accessibility status
  - Toddler-friendly indicators
  - Image support (cover image + gallery)
- **User Authentication**: Secure login system using NextAuth.js
- **Mock Authentication**: Development mode with test users (no OAuth setup required)
- **Type-Safe API**: End-to-end type safety with tRPC
- **Form Validation**: React Hook Form with Zod validation
- **Responsive Design Foundation**: Mobile-first approach with Tailwind CSS
- **Database Migrations**: Automated schema management with Drizzle

### 🚧 In Progress

- Image upload functionality
- Playground detail pages
- Admin panel for playground management
- Error handling and loading states
- Responsive layout optimization
- Multi-language support (Icelandic/English)

### 📋 Planned Features

- Playground reporting system (broken equipment, safety hazards)
- Google Maps directions integration
- User-contributed playground reviews
- Advanced filtering (age groups, equipment types)
- Public submission system
- Mobile app (future consideration)

## 🛠️ Tech Stack

This project uses the **T3 Stack** - a modern, type-safe full-stack TypeScript framework:

### Core Technologies

- **[Next.js 14](https://nextjs.org)** - React framework with App Router
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

4. **Enable Mock Authentication (Development)**

   ```bash
   ./enable-mock-auth.sh
   ```

   Or manually add to your `.env`:

   ```env
   ENABLE_MOCK_AUTH=true
   ```

5. **Start the database**

   ```bash
   ./start-database.sh  # From WSL
   ```

6. **Run database migrations**

   ```bash
   pnpm db:push
   ```

7. **Start development server**
   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🔐 Authentication

### Development Mode (Mock Authentication)

For easy development and testing, the app includes mock authentication that doesn't require OAuth setup:

**Mock Users Available:**

- **Skúli Arnarsson** - `skuli@example.com`
- **Jane Parent** - `jane@example.com`
- **John Playground Expert** - `john@example.com`

**To use mock authentication:**

1. Ensure `ENABLE_MOCK_AUTH=true` in your `.env` file
2. Visit `/api/auth/signin`
3. Select "Mock Authentication"
4. Choose any of the test users

**To switch back to real authentication:**

1. Set `ENABLE_MOCK_AUTH=false` in your `.env` file
2. Add your Discord OAuth credentials
3. Restart the development server

### Production Mode (OAuth)

For production, set up Discord OAuth:

1. Create a Discord application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Add OAuth2 redirect URL: `https://yourdomain.com/api/auth/callback/discord`
3. Set `ENABLE_MOCK_AUTH=false` (or remove the variable)
4. Add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` to your environment

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

- **[Vercel](https://vercel.com)** (recommended for Next.js)
- **[Railway](https://railway.app)**
- **[Fly.io](https://fly.io)**

## 🤝 Contributing

This is currently a personal project, but contributions and suggestions are welcome! Feel free to:

1. Report bugs or issues
2. Suggest new features
3. Submit pull requests

## 📄 License

This project is private and intended for personal/educational use.

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
