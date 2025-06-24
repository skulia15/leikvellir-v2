# Leiksvæði - Playground Discovery Platform

## Elevator Pitch

Leiksvæði is a modern web application that helps families in Iceland discover and explore playgrounds. With an interactive map, detailed playground information, and community contributions, Leiksvæði makes it easy to find the perfect playground that matches your family's needs - whether you're looking for toddler-friendly equipment, accessible facilities, or playgrounds near your current location.

## Project Description

Leiksvæði (Icelandic for "playgrounds") is a comprehensive playground mapping platform built specifically for Iceland. The application combines a modern tech stack with user-friendly design to create a valuable resource for parents and caregivers.

Using the T3 Stack (TypeScript, tRPC, Tailwind CSS, Next.js), Leiksvæði offers an interactive Google Maps integration showing playground locations throughout Iceland. Users can filter playgrounds by distance, age-appropriateness, accessibility features, and more. The platform includes detailed information about each playground, including available equipment, photos, and whether it's accessible to the public during school hours.

The application features a responsive design optimized for both desktop and mobile use, ensuring parents can find playgrounds whether planning at home or on the go. With multi-language support (Icelandic, English, and Polish), Leiksvæði serves Iceland's diverse population.

## Project Goals

1. **Improve Playground Discovery**: Make it easy for families to find suitable playgrounds based on their specific needs and location
2. **Build a Comprehensive Database**: Create the most complete resource of playground information in Iceland
3. **Foster Community Participation**: Enable users to contribute by submitting new playgrounds, adding photos, and suggesting edits
4. **Ensure Accessibility Information**: Provide detailed data about playground accessibility features for families with different needs
5. **Deliver a Seamless User Experience**: Create an intuitive, responsive interface that works well on all devices
6. **Support Multiple Languages**: Make the platform accessible to Iceland's diverse population through multilingual support

## Current Features

### Interactive Map System

- Google Maps integration showing playground locations
- Custom markers with different colors for different playground types
- Current location tracking with "find nearby" functionality
- Distance-based search and filtering
- Directions integration with Google Maps

### Comprehensive Playground Database

- Detailed playground information including:
  - Geographic coordinates
  - Accessibility status
  - Toddler-friendly indicators
  - School playground status and hours
  - Municipality information
  - Available equipment list
  - Public access information
  - Cover images and photo galleries

### User Authentication System

- Secure login system using NextAuth.js
- OAuth integration for production
- Mock authentication for development (no OAuth setup required)
- Role-based access control with user, admin, and super_admin roles

### Admin Panel

- User management dashboard (for super admin)
- Playground review and approval system
- Role-based navigation and features
- Admin mode toggle with persistent state

### Image Management

- Multiple image upload support for playgrounds
- Drag-and-drop interface with validation
- Admin cover image selection during review
- Cloud storage integration for images

### Playground Submission System

- Public submission with admin approval workflow
- Form validation with React Hook Form + Zod
- Status tracking (pending, approved, rejected)
- Admin review with edit capabilities
- Rejection reasons and feedback

### User Interface

- Responsive design foundation with Tailwind CSS
- Multi-language support (Icelandic/English/Polish)
- Accessibility-focused components using Radix UI
- Modern design with shadcn/ui components

### Technical Infrastructure

- End-to-end type safety with TypeScript and tRPC
- Database migrations with Drizzle ORM
- SEO optimization with dynamic sitemap generation
- Analytics integration with PostHog
- Comprehensive error handling with custom error boundaries

## Planned Features

### Enhanced Community Features

- User-contributed playground reviews and ratings
- Check-in system for playgrounds
- Star rating system
- Community image contributions
- User notification system for approved submissions

### Advanced Playground Information

- Facilities information (bathrooms, benches, shade, parking)
- Safety features (fencing, soft ground, etc.)
- School hours integration with holidays and schedule
- Maintenance status and reporting

### Reporting System

- Playground issue reporting (broken equipment, safety hazards)
- Direct submission to municipality of playground
- Image attachment for reports
- Status tracking for reported issues

### Search and Filter Enhancements

- Advanced filtering by equipment type, age group, and facilities
- Sort by rating, distance, or other criteria
- Search by address or landmark
- Filter by current accessibility (considering school hours)

### Technical Improvements

- Dark theme support
- Production monitoring and logging with Sentry
- Automated image optimization and thumbnails
- AI-Vision to determine playground equipment types from photos

## Technology Stack

Leiksvæði is built on the T3 Stack, a modern, type-safe full-stack TypeScript framework:

### Core Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **tRPC** - End-to-end type-safe APIs
- **Drizzle ORM** - TypeScript ORM
- **NextAuth.js** - Authentication
- **PostgreSQL** - Database

### UI & Components

- **Radix UI** - Unstyled, accessible components
- **shadcn/ui** - Beautiful component library
- **Lucide React** - Icon library
- **react-google-maps** - Google Maps integration
- **React Hook Form** - Performant forms with validation

### Development & Deployment

- **PNPM** - Fast, disk space efficient package manager
- **ESLint & Prettier** - Code linting and formatting
- **Drizzle Kit** - Database migrations
- **Vercel** - Deployment platform
- **Vitest** - Testing framework

## Project Architecture

The project follows a modern architecture based on Next.js App Router with a clear separation of concerns:

- **Frontend**: Next.js App Router with a mix of server and client components
- **API**: tRPC provides type-safe endpoints with input validation
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Authentication**: NextAuth.js with role-based permissions
- **State Management**: React Query for server state, React Context for client state
- **Testing**: Vitest with React Testing Library and MSW

The code is organized following Next.js App Router conventions with feature-based folders, shared components, and utilities.
