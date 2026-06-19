# Phase 2 — Solid.js TUI Refactor

**Status: ✅ Completed**

- **Branch**: `feature/solid-js-integration` (suggested)
- **TUI Stack**: `@opentui/solid` + `solid-js` + `@opentui/keymap`

---

## Rationale

The MVP TUI was built with the functional `@opentui/core` API (`Box`, `Text`, `Select`, imperative callbacks).
This works but does not scale to multi-page navigation, reusable dialogs, keyboard-driven UX, or reactive state.
Moving to Solid.js brings:

- **Declarative JSX components** — no more manual renderable assembly
- **Fine-grained reactivity** — signals/memos instead of manual `content =` assignments
- **OpenCode-inspired patterns** — `DialogProvider`, `KeymapProvider`, contextual `useBindings`, status bar, command palette
- **Correct keyboard handling** — layered keymaps via `@opentui/keymap`, no ad-hoc `renderer.keyInput.on()`

---

## UX Priorities (In Order)

1. **Bottom status bar** (mandatory — OpenCode-inspired)
   - Always visible at terminal bottom
   - Shows available hotkeys for the current context (initially `ctrl/cmd+p commands · q quit`)
   - Updates reactively as focus or key layers change
2. **Command palette** (mandatory — VSCode/Slack/OpenCode-style)
   - Triggered by a key chord (e.g., `ctrl+p` or `cmd+p`)
   - Overlay list of navigable commands
   - Cross-cuts all pages and actions
3. **Dialog provider** — stack-based overlay dialogs for alerts, prompts, confirmations, the update notification
4. **Update dialog** — converts current imperative modal into a Solid component within the dialog provider

---

## Token System

### Palette

Expand `src/tui/tokens.ts` to include all commented-out website colors as real palette entries.

```ts
export const palette = {
  // Brand core
  black: "#101820",
  pink50: "#fc6f83",
  yellow: "#f8ea36",
  teal50: "#9ad9e9",
  teal75: "#2daccc",
  green: "#8dc975",
  white: "#ffffff",

  // Extended
  black10: "#e4e4e5",
  black25: "#c9c9cb",
  black50: "#939497",
  black75: "#5e5f61",
  blue: "#8599f8",
  blue10: "#eef0fe",
  blue100: "#081c81",
  brown: "#734400",
  green10: "#eff7eb",
  green100: "#2e5120",
  greyBlue: "#334251",
  maroon: "#7f0315",
  orange: "#f7a836",
  purple: "#c98bdb",
  red: "#e40526",
  skyblue: "#9ad9e9",
  teal10: "#e9f7fa",
  teal25: "#cdecf4",
  teal75: "#2daccc",
  yellow10: "#fefce2",
  yellow75: "#f7a836",
  pink10: "#ffeaed",
  pink25: "#fecbd3",
} as const;
```

### Semantic Tokens

Add a `tokens` object that references the palette. This keeps palette as the raw source and tokens as the theme contract so the rest of the codebase never reaches into palette directly.

```ts
export const tokens = {
  // Surfaces
  bg: palette.black,
  surface: palette.black75,
  surfaceRaised: palette.greyBlue,
  surfaceOverlay: palette.black,

  // Text
  text: palette.white,
  textDim: palette.black50,
  textMuted: palette.black50,
  textAccent: palette.teal75,
  textInverse: palette.black,

  // Brand accent
  accent: palette.teal75,
  accentSoft: palette.teal50,

  // Semantic
  success: palette.green,
  warning: palette.yellow,
  danger: palette.pink50,
  info: palette.teal50,

  // Interactive
  selectionBg: palette.teal50,
  selectionText: palette.black,

  // Borders
  border: palette.black75,
  borderFocus: palette.teal75,
} as const;
```

### Design Direction

No ASCII art logos unless they are genuinely brand-relevant. The WTC tiny-font logo from the MVP can stay as a lightweight branding element on the dashboard.

---

## Migration Steps

### Step 1 — Add Dependencies and Config

Package manager additions in `package.json`:

- `solid-js` (dependency)
- `@opentui/solid` (dependency)
- `@opentui/keymap` (dependency)

`tsconfig.json` additions:

```json
"jsx": "preserve",
"jsxImportSource": "@opentui/solid"
```

Avoid top-level `bunfig.toml` preload entries for Solid. Standalone binaries read project config at runtime, and a top-level preload can make the compiled executable try to resolve `@opentui/solid/preload` from disk.

Keep any required preload scoped to tests or source-only workflows, not production binary startup.

`scripts/build.ts` — add the Solid Bun plugin:

```ts
import solidPlugin from "@opentui/solid/bun-plugin"
// … in Bun.build config:
plugins: [solidPlugin],
```

### Step 2 — Expand Tokens

Edit `src/tui/tokens.ts` to include the full `palette` and the updated `tokens` object described above.

### Step 3 — Use Tokens Directly

Components should import `tokens` from `src/tui/tokens.ts` directly.

```ts
import { tokens } from "../tokens.ts";
```

Do not add a `ThemeProvider` or `useTheme` hook while the app has one fixed brand theme. Add a provider only if runtime theming becomes necessary.

### Step 4 — Use OpenTUI Keymap Directly

Use `@opentui/keymap` imports directly until the app needs custom keymap behavior.

```ts
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider, useBindings, useKeymapSelector } from "@opentui/keymap/solid";
```

Do not add a local `keymap.tsx` wrapper while it only re-exports library functions. Add one later if we introduce app-specific behavior such as user-configurable keybinds, command formatting, mode stacks, leader keys, or shared command registry helpers.

Global bindings (quit, status bar update, command palette) are registered inside Solid components via `useBindings`.

### Step 5 — Create Dialog Provider

File: `src/tui/components/dialog.tsx`

Simplified from OpenCode's pattern:

- `DialogProvider` wraps children + an inline absolute overlay
- `useDialog()` returns `{ show, replace, clear }`
- `show(element, onClose?)` pushes onto a stack
- `replace(element, onClose?)` replaces the stack (for single-dialog mode)
- `clear()` closes all
- Escape key dispatches `clear` via `useBindings`
- Base `<Dialog>` component renders a full-screen semi-transparent overlay with a centered raised panel

The implementation:

- Uses `createStore` with a `stack` array
- Render the overlay inline after children, matching OpenCode's pattern. Do not use `Portal` here unless there is a concrete layering issue.
- The overlay box has `position: "absolute"`, `zIndex: 3000`, `backgroundColor: RGBA.fromInts(...)` for the dimming effect
- Dialog panel width is capped at 60 columns by default (or configurable)

### Step 6 — Create Update Dialog

File: `src/tui/components/update-dialog.tsx`

Replaces the imperative `createModal` from MVP.

Props:

```ts
interface UpdateDialogProps {
  currentVersion: string;
  latestVersion: string;
  repo: string;
}
```

Layout:

```
┌─────────────────────────────────────┐
│  Update Available                   │
│                                     │
│  v0.1.9 → v0.2.0                    │
│                                     │
│  curl -fsSL https://...install.sh   │
│         | bash                      │
│                                     │
│        [enter] close                │
└─────────────────────────────────────┘
```

Behavior:

- `enter` or `escape` closes via `dialog.clear()`
- Uses `useBindings` for keyboard handling, not `renderer.keyInput.on()`
- Text colors from tokens: title in `pink50`, version in `teal75`, command on `surfaceRaised` background

### Step 7 — Convert Dashboard to Solid JSX

File: `src/tui/pages/dashboard.tsx`

Replace `createDashboard()` with an intro-only screen. Do not include a navigation `<select>` on the dashboard; navigation starts in the command palette.

No `findDescendantById`, no dashboard select, and no rendering tests for this visual-only screen.

### Step 7.5 — Add Initial Pages

Add placeholder pages used by the first command palette commands:

- `src/tui/pages/github.tsx`
- `src/tui/pages/settings.tsx`

These pages are intentionally lightweight until their real feature phases begin.

### Step 8 — Create Status Bar

File: `src/tui/components/status-bar.tsx`

A bottom-pinned bar that shows active keybinding hints for the current context. This is the **mandatory** UX pattern from OpenCode.

The status bar is rendered inside the root app layout, below the main content area, using absolute positioning. It can become fully dynamic later, but the initial UX should reliably advertise the command palette shortcut.

### Step 9 — Create Command Palette

File: `src/tui/components/command-palette.tsx`

A **mandatory** keyboard-driven overlay for quick navigation and actions.

- Triggered by `mod+p` plus explicit `ctrl+p` fallback via a global binding in `app.tsx`
- Registers its own layer via `useBindings` that activates when the palette is open
- Renders a filter input and command list
- On select, dispatches the command and closes
- Escape closes without action

---

## Testing Strategy

Per the testing philosophy in `AGENTS.md`:

- **Do not test TUI rendering.** No tests for box dimensions, text positions, ASCII art, or styling tokens.
- **No mocks of `@opentui/solid` or `@opentui/core`.** If a function delegates to OpenTUI, trust it.
- **Remove existing dashboard tests** that assert text content (`expect(frame).toContain(...)`) — those test the renderer's output, not our logic.
- **Test pure logic and state transformations:**
  - `UpdateDialog` — test that correct version strings and install command are constructed
- `CommandPalette` — test command filtering against a query string (pure function)
  - `tokens.ts` — verify palette values are readonly and token keys map to palette keys (structural contract)
  - `update-check.ts` — existing tests already cover this well; keep them
- **Future tests:** dialogs' `onClose` callbacks, command dispatch behavior (if factored as testable functions).

---

## Future-Proofing Notes

- Add a local keymap module only when Phase 3+ needs app-specific command registration, key formatting, mode stacks, leader keys, or configurable user bindings.
- The status bar is intentionally simple — it can become richer (git branch, AWS profile, timer status) in Phase 5-6.
- The command palette starts with GitHub and Settings navigation commands; add real commands as feature pages mature.
- DialogProvider supports a stack but we only use single-dialog mode for now. Stack semantics are ready for multi-dialog flows like wizards.
- Routing is intentionally local app state for now, persisted as `{ page, tab }` so pages like Teamwork can restore their active tab. Add a larger router only when route complexity requires it.

---

## Verification Checklist

Before committing:

- [ ] `bun run fmt:check` passes
- [ ] `bun run lint` passes
- [ ] `bun run check` passes (tsc)
- [ ] `bun test` passes
- [ ] `bun run build` produces working binary
- [ ] Old dashboard tests removed / replaced with logic-based tests
- [ ] AGENTS.md updated (already done above if linked)
- [ ] PLANS.md Phase 2 updated to reference this doc
