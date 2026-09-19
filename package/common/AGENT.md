# Agent Guidelines for VeySur Common Library (repo/common/)

## Project Overview
Shared TypeScript library containing common code, utilities, and types used by both the frontend app and backend API.

## Build/Test Commands
- `pnpm build` - Build TypeScript library to dist/
- `pnpm test` - Run Jest tests
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Clean dist/ directory

## Code Style
- **Types**: TypeScript with relaxed settings (strict: false, noImplicitAny: false)
- **Testing**: Jest with TypeScript, tests in `src/**/*.test.{ts,tsx}`
- **Imports**: Use ES6 imports, prefer named imports
- **Formatting**: Prettier config: 2 spaces, no semicolons, single quotes, trailing commas
- **Error Handling**: Use proper TypeScript error types, avoid `any`

## Key Dependencies
- mzen-id for ID generation
- mzen-schema for data validation
- mzen-schema-validator-remote for remote validation
- moment-timezone for date handling
- Jest for testing

## Development Notes
- Used as dependency in both app and api projects
- Contains shared types, utilities, and validation schemas
- Must be built before dependent projects can use changes
- Export all public APIs through main index.ts file
- Keep dependencies minimal to avoid conflicts in consuming projects

## mzen Packages as Git Submodule
- mzen packages (mzen-id, mzen-schema) are maintained in separate git repository at `external/mzen/`
- They are included in the pnpm workspace (see root `pnpm-workspace.yaml`)
- Dependencies use `workspace:*` protocol to reference workspace packages
- This allows TypeScript source access while keeping mzen as a separate codebase
- No special Jest configuration needed - pnpm workspace handles dependency resolution