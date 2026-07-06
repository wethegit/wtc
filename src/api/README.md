# `src/api/` — Shared business logic layer

All business logic lives here, organized by domain. Both `src/cli/` and `src/tui/` import from `src/api/` — never the reverse.

## Domains

| Directory   | Responsibility                                           |
| ----------- | -------------------------------------------------------- |
| `teamwork/` | Teamwork API wrappers, native timers, task/data types    |
| `config/`   | Config file loading, saving, validation, schemas         |
| `state/`    | Per-directory TUI state persistence (route memory)       |
| `cache/`    | Cache directory management (`getCacheDir`, `clearCache`) |

## Conventions

### No presentation concerns

Functions in `src/api/` do not write to stdout, render JSX, or call `setMessage`. They take input and return data. Formatting output strings for display is the caller's responsibility (CLI handlers or TUI components).

### Pure functions stay pure

Utilities like `formatTimerDuration`, `getTimerElapsedMs`, and Zod schemas are pure exports.

### Format comments

Functions that produce a formatted string for CLI/TUI display include a JSDoc `@example` or `Example output:` block showing the expected format. See `formatTimerListOutput` or `formatTeamworkTaskListPinnedOutput` for the pattern.
