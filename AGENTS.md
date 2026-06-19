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
| Test runner       | bun test                      |
| Pre-commit        | husky + lint-staged           |
| Release versions  | Changesets                    |
| Config validation | zod                           |

## Conventions

### Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

- Do note make a commit unless requested, always check-in with user first before making the commit so they can check diff and ask for changes
- Stop at a breakpoint before every commit and before continuing to the next main step. The user will inspect the diff themselves; do not commit or continue until they explicitly approve.

### TypeScript

- strict mode, no `any`, no `as` casts where avoidable
- Named exports only, no default exports
- `verbatimModuleSyntax` — use `import type` for type-only imports
- Files: `kebab-case.ts`
- Types: `PascalCase`
- Functions: `camelCase`
- Tests: `*.test.ts` in `tests/` mirroring `src/` structure

### Comments

- Do not add comments that restate obvious code mechanics.
- Add comments when they explain why code exists, why a tradeoff was chosen, or how a non-obvious constraint affects implementation.
- Add comments for complex systems, security-sensitive flows, persistence formats, API boundaries, and cache/invalidation behavior.
- Prefer comments on TypeScript interfaces/types when they clarify domain meaning or intended usage.
- If code needs a comment to justify an abstraction, first consider whether the abstraction should be removed instead.

### TUI Key Labels

- When displaying keys to users in status bars, help text, docs, or command descriptions, prefer glyphs for arrows: `←`, `→`, `↑`, `↓` instead of `left`, `right`, `up`, `down`.
- Keybinding registration strings should still use the names expected by `@opentui/keymap` such as `ctrl+left` and `ctrl+right`.

### File Organization / Helper Scope

- Keep helpers scoped to the smallest place that needs them.
- Put values/functions in `consts.ts` only when they are shared across modules or own environment-variable behavior.
- Keep filenames, local paths, and one-module constants inside the module that uses them.
- Do not export helpers only for tests unless they represent meaningful domain behavior.
- Do not create helper functions for one-use expressions.
- Prefer inline local constants over private one-line functions.
- Manager modules should contain domain behavior, not generic wrappers around simple file reads/writes.
- If a helper exists only to make a test easier, reconsider the test or test higher-level behavior instead.
- Do not split one workflow into private helpers unless those helpers are reused or represent meaningful domain behavior; keep the workflow in one function and add a clarifying comment when needed.

### Third-Party API Requests

- For read operations, use REST-style names like `getTeamworkProjectMetadata()` rather than `load*` or `fetch*` when callers should not care whether data comes from cache or network.
- A `get*` API should own the full read path: check cache when applicable, fetch from the service when needed, save cache when applicable, and return the result.
- Keep shared HTTP behavior, such as base URLs, auth headers, JSON parsing, timeouts, and status handling, in a provider client module so individual endpoint modules do not duplicate it.

Examples:

- `getCacheDir()` belongs in `src/state/consts.ts` because it is shared and owns `WTC_CACHE_DIR`.
- `getUserConfigDir()` belongs in `src/config/consts.ts` because it owns `WTC_CONFIG_DIR`.
- `STATE_FILE = "tui-state.json"` belongs in `src/state/manager.ts` because only the state manager uses it.
- `getStatePath()` should not exist if it only appends `STATE_FILE` to `getCacheDir()` in one module.
- `formatUserConfig()` is valid because Bun's YAML parser does not preserve comments, so config saves need explicit commented formatting.

## Code Quality Rules

ONLY run these commands and nothing else.

- [ ] `bun run check` passes (tsc)
- [ ] `bun test` passes
- [ ] No `any` types, no default exports

**NEVER** run the binary compiled files.

## Testing Philosophy

- **Test logic, not layout.** Tests should cover pure functions, business logic, API clients, and utility modules. Do not test TUI rendering (box position, text content, styling against OpenTUI components) — that's the framework's job.
- **Do not retest Zod.** Schema tests should cover WTC-owned contracts only: supported config/state versions, defaults or migrations the app relies on, forward-compat behavior, or other non-obvious policy. Do not add tests that only prove Zod accepts valid shapes or rejects invalid primitive types.
- **No mocks of the OpenTUI renderer.** Module-mocking `@opentui/core` (Box, Text, createCliRenderer, t) adds fragility and tests the mock, not the real behavior. If a function delegates to OpenTUI, trust the function; test what it computes, not how it renders.
- **Prefer real calls over mocks.** For utilities like `checkForUpdate`, test with a real (or near-real) API surface — mock at the HTTP layer only if necessary.
- **Integration tests for CLI flows** are acceptable only when they invoke the binary as a subprocess (e.g., `wtc --version`), but are deferred until Phase 2+.
