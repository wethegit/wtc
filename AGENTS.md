## Overview

`wtc` is a CLI/TUI tool for managing GitHub repos, AWS Amplify projects, and Teamwork tasks. Built with Bun + OpenTUI Solid.

## Important Files

Before making changes, read these files for context:

- **`plans/PLAN.md`** — Full project roadmap, architecture, conventions, all phases

## Tech Stack

| Concern           | Choice                        |
| ----------------- | ----------------------------- |
| Runtime           | Bun                           |
| TUI               | `@opentui/solid` + `solid-js` |
| CLI parser        | yargs                         |
| Linter            | oxlint                        |
| Formatter         | oxfmt                         |
| Pre-commit        | husky + lint-staged           |
| Release versions  | Changesets                    |
| Config validation | zod                           |

## Conventions

### Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

- Do not make a commit unless requested, always check-in with user first before making the commit so they can check diff and ask for changes
- Stop at a breakpoint before every commit and before continuing to the next main step. The user will inspect the diff themselves; do not commit or continue until they explicitly approve.

### TypeScript

- strict mode, no `any`, no `as` casts where avoidable
- Named exports only, no default exports
- `verbatimModuleSyntax` — use `import type` for type-only imports
- Files: `kebab-case.ts`
- Types: `PascalCase`
- Functions: `camelCase`

### Comments

- Do not add comments that restate obvious code mechanics.
- Add comments when they explain why code exists, why a tradeoff was chosen, or how a non-obvious constraint affects implementation.
- Add comments for complex systems, security-sensitive flows, persistence formats, API boundaries, and cache/invalidation behavior.
- Prefer comments on TypeScript interfaces/types when they clarify domain meaning or intended usage.
- If code needs a comment to justify an abstraction, first consider whether the abstraction should be removed instead.

### TUI Key Labels

- When displaying keys to users in status bars, help text, docs, or command descriptions, prefer glyphs for arrows: `←`, `→`, `↑`, `↓` instead of `left`, `right`, `up`, `down`.
- Keybinding registration strings should still use the names expected by `@opentui/keymap` such as `ctrl+left` and `ctrl+right`.

### Solid TUI Rendering

- Prefer Solid control-flow primitives such as `<Switch>`, `<Match>`, `<Show>`, and `<For>` for component-level conditional rendering and lists instead of nested JSX ternaries.
- Small inline value conditionals are fine when they keep markup clearer than an extracted control-flow block.

### File Organization / Helper Scope

- Keep helpers scoped to the smallest place that needs them.
- Put values/functions in `consts.ts` only when they are shared across modules or own environment-variable behavior.
- Keep filenames, local paths, and one-module constants inside the module that uses them.
- Do not create helper functions for one-use expressions.
- Prefer inline local constants over private one-line functions.
- Manager modules should contain domain behavior, not generic wrappers around simple file reads/writes.
- Do not split one workflow into private helpers unless those helpers are reused or represent meaningful domain behavior; keep the workflow in one function and add a clarifying comment when needed.

### Third-Party API Requests

- For read operations, use REST-style names like `getTeamworkProjectMetadata()` rather than `load*` or `fetch*` when callers should not care whether data comes from cache or network.
- A `get*` API should own the full read path: check cache when applicable, fetch from the service when needed, save cache when applicable, and return the result.
- Keep shared HTTP behavior, such as base URLs, auth headers, JSON parsing, timeouts, and status handling, in a provider client module so individual endpoint modules do not duplicate it.
- Do not create separate cache-read/cache-write/fetch helpers for every endpoint unless those helpers are reused across endpoints or encode meaningful domain behavior.

Examples:

- `getCacheDir()` belongs in `src/api/cache/consts.ts` because it is shared and owns `WTC_CACHE_DIR`.
- `getUserConfigDir()` belongs in `src/api/config/consts.ts` because it owns `WTC_CONFIG_DIR`.
- `STATE_FILE = "tui-state.json"` belongs in `src/api/state/manager.ts` because only the state manager uses it.
- `getStatePath()` should not exist if it only appends `STATE_FILE` to `getCacheDir()` in one module.
- `formatUserConfig()` is valid because Bun's YAML parser does not preserve comments, so config saves need explicit commented formatting.

## Code Quality

- `bun run check` must pass (tsc)
- `bun run lint` must pass
- No `any` types, no default exports
- **Never write tests.** Do not add, modify, or create test files. Do not add DI, abstractions, exports, or any other code whose only purpose is to support testing.

**NEVER** run binary compiled files.
