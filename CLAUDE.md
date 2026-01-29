# Leikvellir v2 — Icelandic Playground Discovery App

## Stack
- Next.js 15, React 18, TypeScript, tRPC, Drizzle ORM, Tailwind CSS 3.4, shadcn/ui
- `node_modules/.bin/tsc --noEmit` to type-check (pre-existing test file errors are expected)
- i18n: `useT()` hook from `~/lib/i18n`, translations in `src/locales/{en,is,pl}.json`
- Types derived from DB enums exported from `~/types` (EquipmentCategory, SchoolType, etc.)

## Design System — "Soft Nordic"
- Fonts: Vollkorn (serif, `font-display`) for headings, Outfit (sans, `font-sans`) for body. Both must support `latin-ext` for Icelandic (þ, ð, æ, ö)
- Primary: soft violet `hsl(258, 55%, 56%)`. Background: cool near-white. Cards: pure white
- Accent dot colors via `--terrain-*` CSS vars: moss (green), water (blue), gold (amber), heather (purple), terracotta (coral), stone (gray)
- Cards: `rounded-xl`, buttons: `rounded-lg`, filter pills: `rounded-full`
- Normal-case for buttons/nav. Uppercase only for tiny section labels

## Component Conventions
- Two card variants exist: `PlaygroundCard` (horizontal, for map sidebar) and `PlaygroundGridCard` (vertical, for /playgrounds grid). Don't delete one when working on the other
- Radix UI ScrollArea hydration gotcha: never place elements as siblings outside ScrollArea — put headers inside with `sticky top-0` to avoid hydration mismatch
- Equipment filter uses OR logic across categories (playground matches if it has equipment in ANY selected category)

## Data
- `getAll` tRPC endpoint returns playgrounds with full equipment data (playgroundEquipment → equipment with category, name, image). No separate query needed for equipment info
- School ground accessibility: use `isSchoolGroundAccessible()` and `getAccessibilityStatus()` from `~/lib/school-hours`
