# ESLint and Prettier Setup

This project uses ESLint and Prettier for code quality and formatting, following the Next.js documentation guidelines.

## Configuration Files

### ESLint (`.eslintrc.cjs`)

- Extends `next/core-web-vitals` and `next/typescript` for Next.js specific rules
- Uses TypeScript-specific rules with `@typescript-eslint/recommended-type-checked`
- Includes `prettier` config to prevent conflicts between ESLint and Prettier
- Custom rules for Drizzle ORM to enforce safe database operations
- Configured to use TypeScript project references for better type checking

### Prettier (`prettier.config.js`)

- Modern formatting options with semicolons, double quotes, and trailing commas
- Integrates with Tailwind CSS via `prettier-plugin-tailwindcss`
- Custom overrides for different file types (JSON, Markdown)
- Configured with `tailwindFunctions` for proper class sorting

### Lint-staged (`.lintstagedrc.js`)

- Runs ESLint with auto-fix on staged TypeScript/JavaScript files
- Runs Prettier on all applicable file types before commits
- Uses Next.js recommended pattern with `--file` flag for better performance

## Available Scripts

```bash
# Linting
pnpm lint          # Run ESLint on all files
pnpm lint:fix      # Run ESLint with auto-fix

# Formatting
pnpm format        # Format all files with Prettier
pnpm format:check  # Check if files are properly formatted


## Features

### ESLint Rules

- **TypeScript strict checking**: Enforces type-safe code
- **Consistent imports**: Prefers type-only imports where possible
- **Nullish coalescing**: Prefers `??` over `||` for safer null checking
- **Unused variables**: Warns about unused variables (allows `_` prefix for ignored params)
- **Drizzle safety**: Enforces `where` clauses for delete and update operations

### Prettier Formatting

- **Tailwind class sorting**: Automatically sorts Tailwind classes
- **Consistent style**: Enforces semicolons, proper spacing, and quote consistency
- **File-specific rules**: Different formatting for JSON and Markdown files

### Pre-commit Hooks

- **Automatic linting**: Fixes ESLint issues before commit
- **Automatic formatting**: Ensures consistent code style
- **Fast execution**: Only processes staged files for performance

## Integration with Next.js

This setup follows the [Next.js ESLint documentation](https://nextjs.org/docs/app/api-reference/config/eslint) recommendations:

1. Uses `next/core-web-vitals` for performance-focused rules
2. Includes `next/typescript` for TypeScript-specific Next.js rules
3. Integrates with Next.js build process via `next lint`
4. Supports both development and production builds

## File Exclusions

The following files and directories are excluded from formatting:

- `node_modules/`
- `.next/`
- Build outputs (`dist/`, `out/`)
- Database migrations (`drizzle/`)
- Lock files (`pnpm-lock.yaml`, etc.)
- IDE and temporary files

## Troubleshooting

### Common Issues

1. **ESLint errors on build**: Run `pnpm lint:fix` to resolve auto-fixable issues
2. **Formatting conflicts**: Ensure `prettier` is last in ESLint extends array

```
