# Phase 3.5 — Persistent TUI State & Cache

**Status: ✅ Completed**

Phase 3.5 adds per-directory UI state persistence and a centralized cache directory so the TUI remembers where the user was (e.g., which page they were on) between launches, scoped to the directory they launched from.

---

## Goal

Create a lightweight, deletable runtime data layer:

- Per-directory TUI state that survives restart but is safe to delete
- Centralized `cache/` directory under `~/.config/wtc/`
- `wtc cache clean` CLI command to wipe all runtime data
- Consolidated update-check cache into the same directory
- No secrets, no durable data — everything in `cache/` is disposable

---

## Decisions

- Cache directory lives at `~/.config/wtc/cache/` (deletable at will).
- TUI state is keyed by absolute directory path so different projects remember their own last route independently.
- Duplicate usage of `homedir()` from `node:os` in the state consts rather than exporting from config — each module stays self-contained.
- Write is explicit (on route change), not debounced per keystroke.
- `wtc cache clean` removes the entire `cache/` directory including TUI state.
- Use Bun-native file APIs directly (`Bun.file().json()`, `Bun.write()`) — no shared wrappers from `manager.ts`.
- The update-check cache moves from `~/.cache/wtc/` into the shared cache dir.

---

## Scope

### In Scope

- Cache directory creation on first use
- `tui-state.json` read/write keyed by CWD
- Solid `StateProvider` context seeded before first render, persists on route change
- Route restore in `app.tsx` from saved state
- `wtc cache clean` CLI handler
- Consolidate update-check cache path to shared cache dir
- Pure tests for state schema and manager

### Out of Scope

- Encrypted secrets or credentials in state
- Scroll position, collapsed sections, or form draft persistence
- Automatic GC of stale entries
- Hotkey/keybinding state persistence
- TUI rendering/layout tests
- `wtc cache` subcommands beyond `clean`

---

## File Structure

### New Files

| File                                    | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `src/state/consts.ts`                   | `CACHE_DIR` constant                         |
| `src/state/schema.ts`                   | Zod schemas for state file format            |
| `src/state/manager.ts`                  | `loadTuiState`, `saveTuiState`, `clearCache` |
| `src/tui/components/state-provider.tsx` | Solid context provider + `useTuiState` hook  |
| `src/cli/commands/cache.ts`             | CLI handler for `wtc cache clean`            |

### Modified Files

| File                        | Change                                                        |
| --------------------------- | ------------------------------------------------------------- |
| `src/utils/update-check.ts` | Point cache to `CACHE_DIR` instead of `~/.cache/wtc/`         |
| `src/tui/app.tsx`           | Wrap `<StateProvider>`, restore last route, persist on change |
| `src/cli/parser.ts`         | Wire `.command("cache", ...)`                                 |
| `plans/PLAN.md`             | Insert Phase 3.5 entry                                        |

---

## Directory Layout

```
~/.config/wtc/
├── wtc.yaml                  # user config (persistent)
└── cache/                    # deletable runtime data
    ├── tui-state.json        # per-directory UI state
    └── update-check.json     # release version cache (consolidated)
```

---

## Schema

File: `src/state/schema.ts`

```ts
import { z } from "zod";

export const ROUTE_PAGES = ["home", "github", "settings", "teamwork"] as const;

export type RoutePage = (typeof ROUTE_PAGES)[number];

export const TuiStateEntrySchema = z.object({
  lastRoute: z.object({
    page: z.enum(ROUTE_PAGES).default("home"),
    tab: z.string().default("index"),
  }),
  lastUpdated: z.string(), // ISO 8601
});

export type TuiStateEntry = z.infer<typeof TuiStateEntrySchema>;

export type Route = TuiStateEntry["lastRoute"];

export const TuiStateFileSchema = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), TuiStateEntrySchema),
});

export type TuiStateFile = z.infer<typeof TuiStateFileSchema>;
```

Persisted shape:

```json
{
  "version": 1,
  "entries": {
    "/home/user/project-a": {
      "lastRoute": {
        "page": "teamwork",
        "tab": "project"
      },
      "lastUpdated": "2026-06-15T10:30:00Z"
    }
  }
}
```

Single-tab pages use `tab: "index"`; multi-tab pages such as Teamwork persist their active tab.

The `z.record(...)` pattern makes future fields (scroll position, collapsed sections, etc.) additive — just append keys to the entry schema.

---

## State Manager

File: `src/state/manager.ts`

All functions use Bun-native APIs directly (`Bun.file().json()`, `Bun.write()`, `Bun.file().exists()`). No shared wrappers.

```ts
import { getCacheDir } from "./consts.ts";
import { TuiStateFileSchema, type TuiStateEntry } from "./schema.ts";
import { resolve } from "node:path";

const STATE_FILE = "tui-state.json";

/** Loads state for a directory, returning defaults when missing. */
export async function loadTuiState(dir: string): Promise<TuiStateEntry>;

/** Merges partial state for a directory and writes to disk. */
export async function saveTuiState(dir: string, partial: Partial<TuiStateEntry>): Promise<void>;

/** Deletes the entire cache directory. */
export async function clearCache(): Promise<void>;
```

`clearCache` removes and recreates the cache directory with cross-platform filesystem APIs.

---

## TUI State Provider

File: `src/tui/components/state-provider.tsx`

```tsx
// Exposes:
export function StateProvider(
  props: { dir: string; initialState: TuiStateEntry } & ParentProps,
): JSX.Element;
export function useTuiState(): {
  state: TuiStateEntry;
  updateState: (p: Partial<TuiStateEntry>) => void;
};
```

- Receives state loaded before first render so route restore happens before the first screen paints.
- `updateState` merges the partial into the current entry and writes to disk.
- No debounce — writes are cheap (small JSON, local file).

---

## TUI Integration (app.tsx)

```tsx
// Provider wraps Home:
<StateProvider dir={process.cwd()} initialState={initialState}>
  <Home />
</StateProvider>;

// Inside Home():
const { state, updateState } = useTuiState();
const [route, setRoute] = createSignal<Route>(state.lastRoute);

function navigate(newRoute: Partial<Route>) {
  const current = route();
  const page = newRoute.page ?? current.page;
  const tab =
    newRoute.tab ?? (newRoute.page && newRoute.page !== current.page ? "index" : current.tab);
  const nextRoute = { page, tab };

  setRoute(nextRoute);
  updateState({ lastRoute: nextRoute });
}
```

Navigate by passing `navigate` to command palette actions instead of direct `setRoute` calls.

---

## CLI: `wtc cache clean`

File: `src/cli/commands/cache.ts`

```bash
wtc cache clean   # removes ~/.config/wtc/cache/ entirely
```

Wired in `parser.ts` as a yargs subcommand:

```ts
.command("cache", "Manage local cache", (yargs) =>
  yargs
    .command("clean", "Delete all cached data", () => {},
      async () => { await cacheClean(); },
    )
    .demandCommand(1, "Please specify a cache subcommand."),
);
```

---

## Consolidate Update-Check Cache

File: `src/utils/update-check.ts`

Replace the current `getCachePaths()` which uses `~/.cache/wtc/` with the shared `CACHE_DIR`:

```ts
// Before:
const cacheDir = `${homeDir}/.cache/wtc`;

// After:
const cacheDir = CACHE_DIR;
```

This brings both caches under one deletable roof.

---

## Implementation Steps

### Step 1 — Define schemas

File: `src/state/schema.ts`

- `TuiStateEntrySchema` with nested `lastRoute: { page, tab }` + `lastUpdated` string
- `TuiStateFileSchema` with `version: 1` + `entries` record

### Step 2 — Create state consts

File: `src/state/consts.ts`

```ts
export const CACHE_DIR = join(homedir(), ".config", "wtc", "cache");
```

### Step 3 — Implement state manager

File: `src/state/manager.ts`

- `loadTuiState(dir)` — reads file, finds entry by key, returns entry or defaults
- `saveTuiState(dir, partial)` — reads/creates file, merges entry, writes
- `clearCache()` — remove cache dir with cross-platform filesystem APIs, recreate empty

### Step 4 — Build StateProvider

File: `src/tui/components/state-provider.tsx`

- `StateProvider` component with `dir` and `initialState` props
- `useTuiState()` hook returning `{ state, updateState }`
- Load before first render, write on `updateState` call

### Step 5 — Wire into app.tsx

- Wrap `<StateProvider>` around `<Home>`
- Read `lastRoute` from state as initial route
- Replace direct `setRoute` calls with `navigate()` that also persists

### Step 6 — Add CLI command

Files: `src/cli/commands/cache.ts`, `src/cli/parser.ts`

- `cacheClean()` handler
- `wtc cache clean` subcommand in yargs

### Step 7 — Consolidate update-check cache

File: `src/utils/update-check.ts`

- Import `CACHE_DIR` from state consts
- Replace `getCachePaths()` logic

### Step 8 — Update master plan

File: `plans/PLAN.md`

- Insert Phase 3.5 entry with link to this document
- Renumber subsequent phases

---

## Testing Strategy

Test logic only. No TUI rendering tests.

### State Schema Tests

File: `tests/state/schema.test.ts`

Do not add tests that only prove Zod accepts valid state shapes or rejects invalid primitive types. Schema tests should protect WTC-owned persistence contracts only:

- Rejects unsupported `version`
- Preserves defaults or migration behavior the app relies on
- Accepts/drops extra unknown fields when that forward-compat behavior is intentional

### State Manager Tests

File: `tests/state/manager.test.ts`

- Round-trip: save then load returns matching entry
- Missing file returns defaults
- Corrupted file returns defaults
- Multiple directories produce independent entries
- `clearCache` removes cache dir

### CLI Tests

File: `tests/cli/commands/cache.test.ts`

- Pure formatter test if output is deterministic
- Integration test deferred

---

## Verification Checklist

- [ ] `bun run fmt:check`
- [ ] `bun run lint`
- [ ] `bun run check`
- [ ] `bun test`
- [ ] `bun run build`
- [ ] TUI restores the last active route for the current directory
- [ ] Different directories remember different routes
- [ ] `wtc cache clean` removes `~/.config/wtc/cache/`
- [ ] After `cache clean`, TUI falls back to default route
- [ ] Update-check cache lives in the shared cache dir
