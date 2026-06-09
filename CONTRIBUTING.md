# Contributing

## Development Setup

```bash
# Clone the repository
git clone https://github.com/anomalyco/homebrew-wtc.git
cd homebrew-wtc

# Install dependencies
bun install

# Set up pre-commit hooks
bun run prepare
```

## Available Commands

```bash
bun run dev          # Watch mode development
bun run lint         # Run oxlint
bun run fmt          # Format with oxfmt
bun run fmt:check    # Check formatting
bun run check        # Typecheck with tsc --noEmit
bun test             # Run tests
bun run build        # Build standalone binary
```

## Code Conventions

- Strict TypeScript — no `any`, no default exports
- `kebab-case.ts` file names, `PascalCase` types, `camelCase` functions
- `import type` for type-only imports
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Branch naming: `(feature|fix|chore)/TASK-XXXXX-description`
- Tests mirror `src/` structure under `tests/`

## Pull Requests

1. Create a branch from `main`
2. Make your changes
3. Ensure `bun run lint`, `bun run check`, and `bun test` pass
4. Ensure `bun run fmt:check` passes
5. Open a PR against `main`

## Before Committing

Pre-commit hooks will automatically run linting and formatting on staged files.
