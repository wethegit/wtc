# wtc — Development Roadmap

A terminal UI tool for developers to manage GitHub repos, AWS Amplify projects, and Teamwork tasks.

- **Status:** Phase 3.5 in progress; Phase 4 Teamwork Foundation planned next
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

### Phase 3.5 — Persistent TUI State & Cache 🔨

See `STATE_MANAGER.md` for the detailed implementation plan, schema, manager API, TUI integration, CLI command, and testing boundaries.

- Add per-directory TUI state persistence (remember last route)
- Cache directory at `~/.config/wtc/cache/` (deletable at will)
- `wtc cache clean` CLI command to wipe all runtime data
- Consolidate update-check cache into the shared cache directory
- Solid `StateProvider` context for TUI components
- Pure tests for schema and manager logic

### Phase 4 — Teamwork Foundation

Phase 4 shifts focus from GitHub creation to Teamwork-centered project workflow. The goal is to make WTC useful inside an existing project by surfacing project context, Teamwork metadata, important links, and eventually task/timer workflows.

#### Route Model

- Replace flat string routes with nested route state that can represent route-specific tabs.
- Add a Teamwork route with two initial tabs: `my-work` for global tasks assigned to the current user, and `project` for project-specific context driven by the nearest `.wtc.yaml`.
- Persist nested route state so reopening WTC restores the active Teamwork tab for that directory.

#### Config Shape

- Keep editable settings centralized in the Settings page first.
- Change project config from a root `teamworkProjectId` field to domain-specific sections:

```yaml
version: 1

project:
  links:
    # - name: Figma
    #   url: https://figma.com/...

teamwork:
  projectId:
```

- `project.links` is generic project metadata for useful URLs such as Figma, staging, docs, dashboards, or other project resources.
- `teamwork.projectId` is Teamwork-specific and will drive project metadata/API calls.
- Keep schema version at `1` while the app is unreleased and config shape is still settling.

#### Settings UX

- Start by making all config editable in the existing Settings page.
- Add enough structure to keep Settings navigable as config grows.
- Plan for a summary/details or accordion-style component for grouped settings: User settings, Project links, Teamwork settings, future GitHub settings, and future Amplify settings.
- Domain routes may later offer contextual edit actions, but Settings remains the source of truth for broad configuration.

#### Teamwork Auth

- Store the Teamwork API token with Bun's OS-backed secret store, not in YAML.
- Use a company Teamwork site constant rather than config; the site does not vary per user/project.
- Allow token setup from the TUI Settings page as the preferred UX: focus the Teamwork token field, enter/paste the token, save, and store it with `Bun.secrets`.
- Never display the stored token value in the TUI; show only status such as `configured` or `missing`.
- Add config auth CLI commands inspired by common CLIs:

```bash
wtc config auth set teamwork --token "TOKEN"
wtc config auth status teamwork
wtc config auth delete teamwork
```

- Prefer provider as a positional argument (`teamwork`) instead of `--provider=teamwork`.
- MVP can accept `--token`, but TUI entry should be available early to avoid shell history leaks.
- Later add `--stdin` or an interactive hidden CLI prompt for non-TUI setup.

#### Teamwork API

- Add a small Teamwork API client wrapper with Basic auth.
- Build the Authorization header from the stored API token using Teamwork's `{API_KEY}:password` Basic-auth format.
- Fetch project metadata by `teamwork.projectId`, including project title/name when available.
- Do not add OAuth for MVP.

#### Cache Strategy

- Do not build a reusable generic cache system yet.
- Add only a tiny purpose-built disk cache for Teamwork project metadata because project names rarely change and Teamwork rate limits are low.
- Task lists, timers, and mutations should start with direct fetch/refresh behavior until real usage proves a shared cache/query abstraction is needed.
- Reconsider `@tanstack/solid-query` or a shared cache manager when dynamic Teamwork task/timer flows become complex enough to justify it.

#### Initial Teamwork Project View

- Show whether a project config was found.
- Show/edit `teamwork.projectId` through Settings first.
- Display configured project links.
- Display cached/fetched Teamwork project metadata.
- Prepare the route for later task/timer actions: assigned project tasks, start/stop time tracking, branch creation, and PR workflows from tasks.

### Phase 5 — GitHub Repo Creation

#### Phase 5.1 - GitHub Repo Creation

- Integration of the Github SDK/API
- `wtc repo create` command + TUI form
- Fetch org templates via GitHub API
- Create repo from template (source files only; settings like branch protection are NOT copied)

#### Phase 5.2 - Advanced Repo Setup

- Set up branch protection via GitHub API after creation
- Optionally clone locally
- Link repo to Teamwork project (writes `.wtc.yaml`)

### Phase 6 — AWS Amplify Hosting

- `wtc amplify create` command + TUI form
- Use @aws-sdk/client-amplify to create Amplify app
- Configure custom domain, branch auto-connection/disconnection
- Build settings from template repo's amplify.yml
- "Help" link to internal Notion docs for AWS setup
- Profile-based auth from ~/.aws/credentials
- Full Terraform-backed config (details TBD)

### Phase 7 — Teamwork Workflow Expansion

- Task ↔ PR linking by parsing branch names (`(feature|fix|chore)/TASK-XXXXX`)
- `wtc teamwork timer start|stop|pause`
- `wtc teamwork link` — link current branch to Teamwork task
- `wtc teamwork open` — open task in browser
- Show project tasks assigned to the current user
- Start/stop time tracking from a selected task
- Start a branch or PR from a selected task
- Timer overview TUI page (active/paused timers)
- Notification popup on timer events
- Project↔Repo mapping in local config + per-repo `.wtc.yaml`

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

## CI/CD Pipelines

### CI (ci.yml) — Every push/PR

```
oxlint --all
tsc --noEmit
bun test
```

### Release (release.yml) — Push to main

```
changeset version -> opens/updates version PR when pending changesets exist
if package.json version changed:
  create v<version> tag
  build: bun build --compile (macOS arm64, macOS x64, Linux x64 glibc)
  upload: attach binaries to GitHub Release
  # no formula/checksum updates — install script downloads latest directly
```

---

## Distribution

### Methods

| Method          | Platforms                    | Install command                                                                     |
| --------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| Install script  | Universal (any Linux, macOS) | `curl -fsSL https://raw.githubusercontent.com/wethegit/wtc/main/install.sh \| bash` |
| GitHub Releases | All                          | Download from releases page                                                         |

All binaries are standalone — no Bun runtime required by end users. No package manager (Homebrew, AUR, etc.) is needed because the install script covers every platform.

### Build Targets

| Target          | Binary path             |
| --------------- | ----------------------- |
| macOS ARM64     | `dist/wtc-darwin-arm64` |
| macOS x64       | `dist/wtc-darwin-x64`   |
| Linux x64 glibc | `dist/wtc-linux-x64`    |

---

## Conventions

### Branching

```
(feature|fix|chore)/TASK-XXXXX-short-description
```

### Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

### TypeScript

- strict mode, no `any`, no `as` casts where avoidable
- Named exports only
- `verbatimModuleSyntax` — use `import type` for type-only imports
- Files: `kebab-case.ts`
- Types: `PascalCase`
- Functions: `camelCase`
- Tests: `*.test.ts` in `tests/` mirroring `src/`
- Schema tests should protect WTC-owned contracts such as versions, defaults, migrations, and intentional forward-compat behavior; do not retest basic Zod validation.

### Code Quality

- oxlint (all rules enabled, error-level)
- oxfmt for formatting
- Pre-commit hook runs lint-staged (oxlint + oxfmt --check on staged)
- CI enforces lint, typecheck, and tests
