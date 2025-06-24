# Leiksvæði Code Review - Solutions

## Executive Summary

Leiksvæði is a well-architected playground mapping application built with the T3 Stack, demonstrating solid understanding of modern TypeScript, React patterns, and database design. The codebase shows good architectural decisions with proper separation of concerns, comprehensive authentication, and type-safe APIs. However, critical security vulnerabilities (exposed API keys), minimal test coverage, and performance concerns significantly impact the overall quality. The application has strong foundations but requires immediate attention to security, testing, and optimization before production deployment. **Grade: C+**

## Identified Issues and Solutions

### Critical Issues

#### LK-001: Google Maps API Key Exposure

**Issue:** Google Maps API key is exposed in client-side code via NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable  
**Impact:** Anyone can inspect the source code and extract the API key, potentially leading to unauthorized usage and unexpected billing charges

**Solution:**

1. **Create server-side proxy for Google Maps operations:**

   - Create `src/app/api/maps/geocode/route.ts` for geocoding requests
   - Create `src/app/api/maps/directions/route.ts` for directions requests
   - Keep the public key but restrict it to specific domains in Google Cloud Console

2. **Restrict API key in Google Cloud Console:**

   - Add domain restrictions: `yourdomain.com/*`, `localhost:3000/*`
   - Restrict to specific APIs: Maps JavaScript API, Places API
   - Set usage quotas to prevent billing surprises

3. **Create environment variable for server-side operations:**
   ```typescript
   // In src/env.js, add to server section:
   GOOGLE_MAPS_SERVER_API_KEY: z.string(),
   ```

**Files to create/modify:**

- `src/app/api/maps/geocode/route.ts`
- `src/app/api/maps/directions/route.ts`
- `src/env.js`

#### LK-002: Minimal Test Coverage

**Issue:** Minimal test coverage across the application with only basic test files present  
**Impact:** High risk of regressions, difficult to maintain code quality, and reduced confidence in deployments

**Solution:**

1. **Install additional testing dependencies:**

   ```bash
   pnpm add -D @testing-library/jest-dom @testing-library/user-event msw
   ```

2. **Create comprehensive test files:**

   - `src/__tests__/api/playground.test.ts` - Test tRPC playground router
   - `src/__tests__/components/playground-card.test.tsx` - Test UI components
   - `src/__tests__/lib/geo-utils.test.ts` - Test utility functions
   - `src/__tests__/integration/playground-flow.test.tsx` - Test user flows

3. **Setup MSW for API mocking:**

   ```typescript
   // src/test/mocks/handlers.ts
   import { createTRPCMsw } from "msw-trpc";
   import { type AppRouter } from "~/server/api/root";

   export const trpcMsw = createTRPCMsw<AppRouter>();
   export const handlers = [
     trpcMsw.playground.getAll.query(() => mockPlaygrounds),
   ];
   ```

**Files to create:**

- `src/test/mocks/handlers.ts`
- `src/test/mocks/data.ts`
- `src/__tests__/api/playground.test.ts`
- `src/__tests__/components/playground-card.test.tsx`

#### LK-003: Large Component Refactoring

**Issue:** Large component (336 lines) with multiple responsibilities and potential memory leaks from useEffect dependencies  
**Impact:** Difficult to maintain, test, and debug. Potential performance issues on mobile devices

**Solution:**

1. **Split home-client.tsx into smaller components:**

**Create these new components:**

```typescript
// src/app/_components/mobile-drawer.tsx
interface MobileDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  playgroundCount: number;
}

// src/app/_components/desktop-sidebar.tsx
interface DesktopSidebarProps {
  children: React.ReactNode;
}

// src/app/_components/playground-content.tsx
interface PlaygroundContentProps {
  filters: PlaygroundFiltersType;
  onFiltersChange: (filters: PlaygroundFiltersType) => void;
  // ... other props
}
```

2. **Extract custom hooks:**

```typescript
// src/lib/hooks/use-mobile-detection.ts
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);
  // ... implementation
}

// src/lib/hooks/use-user-location.ts
export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  // ... implementation
}
```

**Files to create:**

- `src/app/_components/mobile-drawer.tsx`
- `src/app/_components/desktop-sidebar.tsx`
- `src/app/_components/playground-content.tsx`
- `src/lib/hooks/use-mobile-detection.ts`
- `src/lib/hooks/use-user-location.ts`

### High Priority Issues

#### LK-004: Rate Limiting Implementation

**Issue:** No rate limiting or API protection measures implemented  
**Impact:** Vulnerable to abuse, DoS attacks, and excessive resource consumption

**Solution:**

1. **Install rate limiting dependency:**

   ```bash
   pnpm add @upstash/ratelimit @upstash/redis
   ```

2. **Create rate limiting middleware:**

   ```typescript
   // src/lib/rate-limit.ts
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   export const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
   });
   ```

3. **Apply to tRPC procedures:**
   ```typescript
   // In src/server/api/routers/playground.ts
   create: protectedProcedure
     .input(CreatePlaygroundSchema)
     .mutation(async ({ ctx, input }) => {
       const { success } = await ratelimit.limit(ctx.session.user.id);
       if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
       // ... rest of implementation
     }),
   ```

**Files to create/modify:**

- `src/lib/rate-limit.ts`
- `src/server/api/routers/playground.ts`
- `src/env.js` (add Redis URL)

#### LK-005: Mobile Breakpoint and Accessibility

**Issue:** Mobile breakpoint hardcoded (768px) instead of using Tailwind config, accessibility concerns with mobile drawer  
**Impact:** Inconsistent responsive behavior and potential accessibility issues for users with disabilities

**Solution:**

1. **Move breakpoint to Tailwind config:**

   ```typescript
   // In tailwind.config.ts, ensure screens are defined:
   screens: {
     'sm': '640px',
     'md': '768px', // Use this instead of hardcoded 768
     'lg': '1024px',
   }
   ```

2. **Replace hardcoded breakpoint:**

   ```typescript
   // In src/lib/hooks/use-mobile-detection.ts
   import resolveConfig from "tailwindcss/resolveConfig";
   import tailwindConfig from "../../tailwind.config";

   const config = resolveConfig(tailwindConfig);
   const mdBreakpoint = parseInt(config.theme.screens.md);
   ```

3. **Add accessibility features:**
   ```typescript
   // In mobile-drawer.tsx
   <Sheet
     role="dialog"
     aria-label="Playground list"
     onOpenChange={onOpenChange}
   >
     <Sheet.Content
       aria-describedby="playground-list-description"
       onKeyDown={handleKeyDown} // Add keyboard navigation
     >
   ```

**Files to modify:**

- `tailwind.config.ts`
- `src/lib/hooks/use-mobile-detection.ts`
- `src/app/_components/mobile-drawer.tsx`

### Medium Priority Issues

#### LK-006: Comprehensive Error Handling

**Issue:** Error handling is incomplete - some database operations don't properly handle connection failures or validation errors  
**Impact:** Application may crash or provide poor user experience during database issues

**Solution:**

1. **Create error handling utilities:**

   ```typescript
   // src/lib/error-handling.ts
   export class PlaygroundError extends Error {
     constructor(
       message: string,
       public code: string,
     ) {
       super(message);
       this.name = "PlaygroundError";
     }
   }

   export function handleDbError(error: unknown, operation: string) {
     logger.error(`Database error in ${operation}`, { error });
     if (error instanceof Error) {
       throw new PlaygroundError(`Failed to ${operation}`, "DB_ERROR");
     }
     throw new PlaygroundError("Unknown database error", "UNKNOWN_ERROR");
   }
   ```

2. **Wrap database operations:**
   ```typescript
   // In playground router, wrap each db operation:
   try {
     const result = await ctx.db.query.playgrounds.findMany();
     return result;
   } catch (error) {
     return handleDbError(error, "fetch playgrounds");
   }
   ```

**Files to create:**

- `src/lib/error-handling.ts`
- Update all router files to use error handling

#### LK-007: Database Pagination

**Issue:** Database queries lack pagination and could return large datasets causing performance issues  
**Impact:** Slow page loads and potential memory issues when dealing with large numbers of playgrounds

**Solution:**

1. **Add pagination schema:**

   ```typescript
   // src/lib/schemas/pagination.ts
   export const PaginationSchema = z.object({
     limit: z.number().min(1).max(100).default(20),
     cursor: z.number().optional(),
     offset: z.number().min(0).default(0),
   });
   ```

2. **Update playground router:**
   ```typescript
   getAll: publicProcedure
     .input(PaginationSchema.optional())
     .query(async ({ ctx, input }) => {
       const { limit = 20, offset = 0 } = input ?? {};

       const playgrounds = await ctx.db.query.playgrounds.findMany({
         where: eq(playgrounds.status, "approved"),
         limit: limit + 1, // Get one extra to check if there's more
         offset,
         orderBy: desc(playgrounds.createdAt),
       });

       const hasMore = playgrounds.length > limit;
       const items = hasMore ? playgrounds.slice(0, -1) : playgrounds;

       return {
         items,
         hasMore,
         nextOffset: hasMore ? offset + limit : undefined,
       };
     }),
   ```

**Files to create/modify:**

- `src/lib/schemas/pagination.ts`
- `src/server/api/routers/playground.ts`
- Frontend components to handle pagination

### Low Priority Issues

#### LK-008: API Documentation

**Issue:** API endpoints lack JSDoc documentation and formal API documentation  
**Impact:** Difficult for team members to understand API contracts and for future maintenance

**Solution:**

1. **Add JSDoc to all tRPC procedures:**

   ```typescript
   /**
    * Creates a new playground submission
    * @param input - Playground data including title, coordinates, and equipment
    * @returns The created playground with pending status
    * @throws {TRPCError} UNAUTHORIZED if user is not authenticated
    * @throws {TRPCError} BAD_REQUEST if input validation fails
    */
   create: protectedProcedure
     .input(CreatePlaygroundSchema)
     .mutation(async ({ ctx, input }) => {
   ```

2. **Create API documentation generator:**

   ```typescript
   // scripts/generate-api-docs.ts
   import { appRouter } from "../src/server/api/root";

   // Generate markdown documentation from tRPC router
   function generateApiDocs(router: typeof appRouter) {
     // Implementation to extract JSDoc and generate docs
   }
   ```

**Files to create/modify:**

- Add JSDoc to all files in `src/server/api/routers/`
- `scripts/generate-api-docs.ts`
- `docs/API.md`

#### LK-009: Code Style and TODO Cleanup

**Issue:** Inconsistent variable naming (isMobile vs isInitialLoading) and some TODO comments left in production code  
**Impact:** Reduced code readability and potential confusion for maintainers

**Solution:**

1. **Create style guide and enforce with ESLint:**

   ```typescript
   // In .eslintrc.cjs, add rules:
   rules: {
     "@typescript-eslint/naming-convention": [
       "error",
       {
         "selector": "variable",
         "format": ["camelCase", "PascalCase", "UPPER_CASE"]
       }
     ],
     "no-warning-comments": ["warn", { "terms": ["TODO", "FIXME"] }]
   }
   ```

2. **Create TODO tracking script:**

   ```typescript
   // scripts/track-todos.ts
   import { globSync } from "glob";
   import fs from "fs";

   const files = globSync("src/**/*.{ts,tsx}");
   const todos = [];

   files.forEach((file) => {
     const content = fs.readFileSync(file, "utf8");
     const lines = content.split("\n");
     lines.forEach((line, index) => {
       if (line.includes("TODO") || line.includes("FIXME")) {
         todos.push({ file, line: index + 1, content: line.trim() });
       }
     });
   });

   console.log("Found TODOs:", todos);
   ```

3. **Fix naming inconsistencies:**
   - Standardize boolean variables: `isLoading`, `isMobile`, `hasData`
   - Standardize event handlers: `handleClick`, `handleChange`, `handleSubmit`
   - Standardize component props: use consistent interfaces

**Files to create/modify:**

- `.eslintrc.cjs`
- `scripts/track-todos.ts`
- Rename variables throughout codebase for consistency

## Strengths

• Excellent use of TypeScript with comprehensive type safety across the entire stack
• Well-implemented T3 Stack architecture with proper separation of server and client components
• Robust authentication system supporting multiple OAuth providers and mock authentication for development
• Good database schema design with proper relationships, indexes, and foreign key constraints
• Modern UI components using Radix UI and shadcn/ui for accessibility and consistency
• Comprehensive environment variable validation using Zod
• Proper error boundary implementation for graceful error handling
• Internationalization setup with translation support for multiple languages
• Good use of React patterns including proper useCallback and useMemo usage for performance
• Well-structured file organization following Next.js App Router conventions
• Comprehensive logging system with structured logging for debugging and monitoring

## Implementation Priority Order

1. **LK-001** (Critical security fix)
2. **LK-004** (Rate limiting for API protection)
3. **LK-003** (Component refactoring for maintainability)
4. **LK-006** (Error handling for stability)
5. **LK-007** (Pagination for performance)
6. **LK-002** (Test coverage for reliability)
7. **LK-005** (Accessibility improvements)
8. **LK-008** (Documentation)
9. **LK-009** (Code style cleanup)
