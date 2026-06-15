# wtc — Development Roadmap

A terminal UI tool for developers to manage GitHub repos, AWS Amplify projects, and Teamwork tasks.

- **Status:** Phase 3 Completed
- **Package Manager:** Bun
- **Runtime:** Bun (standalone binary distribution)
- **TUI:** @opentui/solid + solid-js
- **Repository:** wtc

---

## Tech Stack

| Concern           | Choice                            | Rationale                                    |
| ----------------- | --------------------------------- | -------------------------------------------- |
| Language          | TypeScript (strict)               | Type safety, team familiarity                |
| Runtime           | Bun                               | OpenTUI native, fast, standalone binaries    |
| TUI               | @opentui/solid + solid-js         | Reactive JSX components, proven dialog model |
| CLI parser        | yargs 18.x                        | Patterns match OpenCode, robust subcommands  |
| Linter            | oxlint                            | 700+ TS rules, Rust-native, fast             |
| Formatter         | oxfmt                             | Pairs with oxlint, zero config               |
| Test runner       | bun test + @opentui/core/testing  | Built-in, no extra deps                      |
| Pre-commit        | husky + lint-staged               | Runs oxlint + oxfmt on staged files          |
| CI/CD             | GitHub Actions                    | Tight GitHub integration                     |
| Release versions  | Changesets                        | Version PRs, changelog, automated tags       |
| Encryption        | Web Crypto (AES-256-GCM + PBKDF2) | Built-in, no extra deps                      |
| Config validation | zod                               | Schema validation for config.json            |
| Distribution      | Install script + GitHub Releases  | Universal Linux, macOS                       |

---

## Architecture

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

- Add user-level config at `~/.config/wtc/wtc.json`
- Add nearest-ancestor project config discovery for `.wtc.json`
- Add layered config loading that returns both resolved config values and the paths used to build them
- Add `wtc settings` command that prints config paths and resolved config JSON
- Replace the placeholder Settings TUI page with an editable config page
- Use explicit save for TUI edits; do not persist every keystroke
- Start with one user-level field: `workspaceName`
- Start with one project-level field: `teamworkProjectId`
- Treat config `version` as a file format version, not the WTC application version

### Phase 4 — GitHub Repo Creation

#### Phase 4.1 - GitHub Repo Creation

- Integration of the Github SDK/API
- `wtc repo create` command + TUI form
- Fetch org templates via GitHub API
- Create repo from template (source files only; settings like branch protection are NOT copied)

#### Phase 4.2 - Advanced Repo Setup

- Set up branch protection via GitHub API after creation
- Optionally clone locally
- Link repo to Teamwork project (writes `.wtc.json`)

### Phase 5 — AWS Amplify Hosting

- `wtc amplify create` command + TUI form
- Use @aws-sdk/client-amplify to create Amplify app
- Configure custom domain, branch auto-connection/disconnection
- Build settings from template repo's amplify.yml
- "Help" link to internal Notion docs for AWS setup
- Profile-based auth from ~/.aws/credentials
- Full Terraform-backed config (details TBD)

### Phase 6 — Teamwork Integration

- Task ↔ PR linking by parsing branch names (`(feature|fix|chore)/TASK-XXXXX`)
- `wtc teamwork timer start|stop|pause`
- `wtc teamwork link` — link current branch to Teamwork task
- `wtc teamwork open` — open task in browser
- Timer overview TUI page (active/paused timers)
- Notification popup on timer events
- Project↔Repo mapping in local config + per-repo `.wtc.json`

### Phase 7 — TUI Dashboard & Settings

- Sidebar navigation between GitHub, Amplify, Teamwork, Settings
- Timer overview page
- Settings page (view config, links to Notion guides)
- Configuration layer with encrypted secrets
- Status bar (timer status, git branch, AWS profile)

### Phase 8 — Distribution Polish

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

### Code Quality

- oxlint (all rules enabled, error-level)
- oxfmt for formatting
- Pre-commit hook runs lint-staged (oxlint + oxfmt --check on staged)
- CI enforces lint, typecheck, and tests
