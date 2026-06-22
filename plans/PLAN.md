# wtc — Development Roadmap

A terminal UI tool for developers to manage GitHub repos, AWS Amplify projects, and Teamwork tasks.

- **Status:** Phase 5 Teamwork Foundation in progress
- **Package Manager:** Bun
- **Runtime:** Bun (standalone binary distribution)
- **TUI:** @opentui/solid + solid-js
- **Repository:** wtc

---

## Tech Stack

| Concern           | Choice                           | Rationale                                    |
| ----------------- | -------------------------------- | -------------------------------------------- |
| Language          | TypeScript (strict)              | Type safety, team familiarity                |
| Runtime           | Bun                              | OpenTUI native, fast, standalone binaries    |
| TUI               | @opentui/solid + solid-js        | Reactive JSX components, proven dialog model |
| CLI parser        | yargs 18.x                       | Patterns match OpenCode, robust subcommands  |
| Linter            | oxlint                           | 700+ TS rules, Rust-native, fast             |
| Formatter         | oxfmt                            | Pairs with oxlint, zero config               |
| Test runner       | bun test + @opentui/core/testing | Built-in, no extra deps                      |
| Pre-commit        | husky + lint-staged              | Runs oxlint + oxfmt on staged files          |
| CI/CD             | GitHub Actions                   | Tight GitHub integration                     |
| Release versions  | Changesets                       | Version PRs, changelog, automated tags       |
| Config validation | zod                              | Schema validation for YAML config files      |
| Distribution      | Install script + GitHub Releases | Universal Linux, macOS                       |

---

## Architecture

### File Organization Conventions

- Keep helpers scoped to the smallest place that needs them.
- Use `consts.ts` only for values/functions shared across modules or owning environment-variable behavior.
- Keep filenames, local paths, and one-module constants inside the module that uses them.
- Avoid helper functions for one-use expressions; prefer inline local constants.
- Manager modules should contain domain behavior, not generic wrappers around simple file reads/writes.
- Do not export helpers only for tests unless they represent meaningful domain behavior.
- Comments should explain why code exists or why a tradeoff was chosen, not restate obvious mechanics.
- Add comments to TypeScript interfaces/types when they clarify domain meaning or intended usage.

Examples:

- `getCacheDir()` lives in `src/state/consts.ts` because it is shared and owns `WTC_CACHE_DIR`.
- `getUserConfigDir()` lives in `src/config/consts.ts` because it owns `WTC_CONFIG_DIR`.
- `STATE_FILE = "tui-state.json"` stays in `src/state/manager.ts` because it is state-manager-only.
- `getStatePath()` should not exist if it only appends `STATE_FILE` to `getCacheDir()` in one module.

## Phases

### Phase 1 — Foundation (MVP) ✅

- Tooling: oxlint, oxfmt, husky, lint-staged, CI, pre-commit hooks
- TUI dashboard with "Hello World" display
- CLI parser with yargs (supports `wtc` + subcommands)
- Build script for standalone binary
- Install script (`install.sh`) for universal distribution
- Built-in update notification (`wtc upgrade --check`, TUI banner on launch)
- Changesets-based version PRs and automated release tags
- Release pipeline with binary builds
- Design tokens (`src/tui/tokens.ts`) for brand-aligned colors
- Modal component for in-TUI alerts
- Documentation: README, AGENTS.md, CONTRIBUTING.md, plans/

See `MVP.md` for detailed deliverables.

### Phase 2 — TUI Refactor to Solid.js ✅

See `SOLID_TUI_REFACTOR.md` for the detailed implementation plan, UX direction, design tokens, dialog/status bar/command palette architecture, testing boundaries, and migration sequence.

- Add `@opentui/solid` + `solid-js` + `@opentui/keymap` as dependencies
- Configure TSX (`jsxImportSource`) and Solid build plugin; avoid top-level Bun preload so compiled binaries do not load dev-only modules at runtime
- Expand `tokens.ts` into full palette + semantic tokens
- Rewrite `src/tui/app.ts` → Solid root component with `<KeymapProvider>` + `<DialogProvider>`
- Keep `src/index.ts` as the OpenCode-style entrypoint that decides whether to launch the TUI or parse CLI commands
- Rewrite `src/tui/components/modal.ts` → `DialogProvider` + `UpdateDialog` (OpenCode-inspired dialog pattern)
- Rewrite `src/tui/pages/dashboard.ts` → Solid JSX intro screen without dashboard navigation select
- Use `@opentui/keymap` directly for `KeymapProvider`, `useBindings`, and `useKeymapSelector`
- Import `tokens.ts` directly from components; do not add a theme provider unless runtime theming becomes necessary
- Add bottom status bar (mandatory — shows active hotkeys per context)
- Add command palette (mandatory — `ctrl/cmd+p` overlay for quick navigation)
- Add initial routes for GitHub and Settings, navigable through the command palette
- Remove all `findDescendantById` patterns
- Update test setup to cover logic only, not TUI rendering

### Phase 3 — Config Setup ✅

See `CONFIG_SETUP.md` for the detailed implementation plan, config versioning model, CLI/TUI behavior, testing boundaries, and migration notes.

- Add user-level config at `~/.config/wtc/wtc.yaml`
- Add nearest-ancestor project config discovery for `.wtc.yaml`
- Add layered config loading that returns both resolved config values and the paths used to build them
- Add `wtc settings` command that prints config paths and resolved config JSON
- Add `wtc config init` command that creates a commented project config
- Replace the placeholder Settings TUI page with an editable config page
- Use explicit save for TUI edits; do not persist every keystroke
- Start with one user-level field: `workspaceName`
- Start with one project-level field: `teamworkProjectId`
- Treat config `version` as a file format version, not the WTC application version

### Phase 4 — Persistent TUI State & Cache 🔨

See `STATE_MANAGER.md` for the detailed implementation plan, schema, manager API, TUI integration, CLI command, and testing boundaries.

- Add per-directory TUI state persistence (remember last route)
- Cache directory at `~/.config/wtc/cache/` (deletable at will)
- `wtc cache clean` CLI command to wipe all runtime data
- Consolidate update-check cache into the shared cache directory
- Solid `StateProvider` context for TUI components
- Pure tests for schema and manager logic

### Phase 5 — Teamwork Workflow

Teamwork work is split into detailed subphase plans under [`plans/teamwork/`](teamwork/README.md).

#### Phase 5.1 — [Teamwork Foundation](teamwork/5.1-foundation.md) ✅

Auth, project config, Teamwork route, project metadata, project links, and shared Teamwork HTTP client.

#### Phase 5.2 — [Pinned Project Task Lists](teamwork/5.2-pinned-project-task-lists.md) 🔨

Project-configured Teamwork task lists for recurring project tasks such as code review, meetings, miscellaneous work, project management, and documentation.

#### Phase 5.3 — [My Work Tasks](teamwork/5.3-my-work-tasks.md)

Assigned Teamwork tasks for the current user with selection and basic task actions.

#### Phase 5.4 — [Timers and Time Tracking](teamwork/5.4-timers-and-time-tracking.md)

Timer overview, task timer indicators, start/pause/delete actions, timesheet access, and timer conflict confirmations.

#### Phase 5.5 — [Branch and PR Workflow](teamwork/5.5-branch-and-pr-workflow.md)

Create branches and draft PRs from Teamwork tasks with timer prompts and useful PR body links.

### Phase 6 — GitHub Repo Creation

#### Phase 6.1 - GitHub Repo Creation

- Integration of the Github SDK/API
- `wtc repo create` command + TUI form
- Fetch org templates via GitHub API
- Create repo from template (source files only; settings like branch protection are NOT copied)

#### Phase 6.2 - Advanced Repo Setup

- Set up branch protection via GitHub API after creation
- Optionally clone locally
- Link repo to Teamwork project (writes `.wtc.yaml`)

### Phase 7 — AWS Amplify Hosting

- `wtc amplify create` command + TUI form
- Use @aws-sdk/client-amplify to create Amplify app
- Configure custom domain, branch auto-connection/disconnection
- Build settings from template repo's amplify.yml
- "Help" link to internal Notion docs for AWS setup
- Profile-based auth from ~/.aws/credentials
- Full Terraform-backed config (details TBD)

### Phase 8 — TUI Dashboard & Settings

- Sidebar navigation between GitHub, Amplify, Teamwork, Settings
- Timer overview page
- Settings page (view config, links to Notion guides)
- Configuration layer with encrypted secrets
- Status bar (timer status, git branch, AWS profile)

### Phase 9 — Distribution Polish

- Documentation site or expanded docs
- Release automation refinements
- Self-upgrade command (`wtc upgrade` with binary download + atomic replace)

---

## Update Mechanism

`wtc` includes a built-in update system so users who install via the install script or direct binary get notified when a new version is available.

### How It Works

1. **Version check on launch**: On startup, `wtc` fetches the latest release tag from the GitHub Releases API (`api.github.com/repos/wethegit/wtc/releases/latest`). This is done asynchronously so it never blocks startup.
2. **24-hour cache**: Results are cached to avoid hitting the API on every launch. The cache is cleared after 24 hours.
3. **TUI notification**: If a newer version exists, a banner appears at the top of the dashboard showing the new version and the update commands.
4. **CLI check**: `wtc upgrade --check` prints the version info and update commands to stdout without opening the TUI.

### Commands

```bash
wtc upgrade --check  # Check for update and print commands to stdout
```

### Who Handles Updates

| Installation method | Update mechanism          |
| ------------------- | ------------------------- |
| Install script      | Re-run the install script |
| Direct binary       | Re-run the install script |
| GitHub Release      | Re-run the install script |

---
