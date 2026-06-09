# wtc — AI Agent Instructions

## Overview

`wtc` is a CLI/TUI tool for managing GitHub repos, AWS Amplify projects, and Teamwork tasks. Built with Bun + OpenTUI (core functional API, no JSX framework).

## Important Files

Before making changes, read these files for context:

- **`plans/PLAN.md`** — Full project roadmap, architecture, conventions, all phases
- **`plans/MVP.md`** — Current MVP scope and deliverables
- **`package.json`** — Scripts and dependencies
- **`tsconfig.json`** — TypeScript configuration (strict mode)

## Tech Stack

| Concern           | Choice                                           |
| ----------------- | ------------------------------------------------ |
| Runtime           | Bun                                              |
| TUI               | `@opentui/core` (functional API, no React/Solid) |
| CLI parser        | yargs                                            |
| Linter            | oxlint                                           |
| Formatter         | oxfmt                                            |
| Test runner       | bun test + `@opentui/core/testing`               |
| Pre-commit        | husky + lint-staged                              |
| Release versions  | Changesets                                       |
| Encryption        | Web Crypto (AES-256-GCM + PBKDF2)                |
| Config validation | zod                                              |

## Conventions

### Branching

```
(feature|fix|chore)/TASK-XXXXX
```

### Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

### TypeScript

- strict mode, no `any`, no `as` casts where avoidable
- Named exports only, no default exports
- `verbatimModuleSyntax` — use `import type` for type-only imports
- Files: `kebab-case.ts`
- Types: `PascalCase`
- Functions: `camelCase`
- Tests: `*.test.ts` in `tests/` mirroring `src/` structure

## Commands

```bash
bun run dev          # Watch mode (src/index.ts)
bun run lint         # oxlint
bun run fmt          # oxfmt (write)
bun run fmt:check    # oxfmt (check only)
bun run check        # tsc --noEmit
bun test             # Run all tests
bun run build        # Build standalone binary
bun run changeset    # Add a release changeset
```

## Code Quality Rules

1. All TypeScript must compile with `tsc --noEmit` (strict mode)
2. All code must pass `oxlint` with no errors
3. All code must pass `oxfmt --check` (formatting)
4. All tests must pass (`bun test`)
5. Pre-commit hook runs lint-staged on staged `.ts` files

## Pull Request Checklist

- [ ] `bun run lint` passes
- [ ] `bun run fmt:check` passes
- [ ] `bun run check` passes (tsc)
- [ ] `bun test` passes
- [ ] New code has tests
- [ ] No `any` types, no default exports
