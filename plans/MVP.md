# MVP — Hello World Dashboard

**Status: ✅ Completed**

The minimum viable product: a CLI tool that installs universally via the install script,
runs with the `wtc` command, and displays a basic TUI dashboard with update notifications.

**Goal:** Get the full foundation in place — tooling, CI/CD, distribution (install script + GitHub Releases),
and a working binary.

---

## Tasks

### 1. Project Scaffolding

- Create directory structure as defined in PLAN.md
- Install dependencies:
  - Runtime: `yargs`, `@types/yargs`, `zod`
  - Dev: `oxlint`, `oxfmt`, `husky`, `lint-staged`, `@types/bun`, `@changesets/cli`
- Configure `oxlintrc.json`
- Configure `.oxfmtrc.json`
- Configure `.changeset/config.json`
- Configure `.lintstagedrc.json`:
  ```json
  {
    "*.ts": ["oxlint --fix", "oxfmt --check"]
  }
  ```
- Init husky with pre-commit hook running `bun lint-staged`

### 2. Scripts in package.json

```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "lint": "oxlint",
    "fmt": "oxfmt --write .",
    "fmt:check": "oxfmt --check .",
    "check": "tsc --noEmit",
    "test": "bun test",
    "prepare": "husky",
    "build": "bun run scripts/build.ts",
    "changeset": "changeset",
    "changeset:status": "changeset status",
    "changeset:version": "changeset version"
  }
}
```

### 3. CLI Entry Point (`src/index.ts` + `src/cli/parser.ts`)

- `wtc` (no args) → launches TUI dashboard
- `wtc --version` → prints version
- `wtc --help` → prints help
- Uses yargs for argument parsing
- No `upgrade` subcommand in MVP — version check happens inside the TUI

### 4. TUI Dashboard (`src/tui/app.ts` + `src/tui/pages/dashboard.ts`)

- "WTC" ASCII art logo (use OpenTUI's ASCIIFont or custom)
- Subtitle: "What will you build?"
- Navigation menu with disabled items:
  - `> GitHub (coming soon)`
  - `> Amplify (coming soon)`
  - `> Teamwork (coming soon)`
  - `> Settings (coming soon)`
- Footer: version + "Press Ctrl+C to exit"
- Active item selectable (cursor/keyboard nav)
- Styled with Box + Text components
- **Update notification**: on mount, `app.ts` fires an async version check via `src/utils/update-check.ts`.
  If a newer version exists, a banner appears at the top of the TUI showing the current/latest version and
  the install script command. `wtc upgrade --check` does the same on the CLI.

### 5. Test Suite (`tests/`)

- `tests/tui/dashboard.test.ts` — using `@opentui/core/testing`:
  ```ts
  import { createTestRenderer } from "@opentui/core/testing";
  // render dashboard, capture frame, assert content
  ```

### 6. Build Script (`scripts/build.ts`)

- Uses `Bun.build()` with `--compile` target
- Platform detection: build for current platform
- Output: `./dist/wtc-<platform>-<arch>`
- Injects version from `package.json` via `--define` so `wtc --version` works in standalone binary
- Use Bun's standalone executable feature

### 7. CI Pipeline (`.github/workflows/ci.yml`)

```yaml
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint
      - run: bun run check
      - run: bun test
```

### 8. Changesets + Release Pipeline

- `.github/workflows/release.yml` runs on pushes to `main`
  - Opens or updates a Changesets version PR when merged changesets are pending
  - Version PR updates `package.json` and `CHANGELOG.md`
  - Detects when the version PR merge changes `package.json`
  - Creates `v<package.version>` tag in the same workflow
  - Builds standalone binaries when the package version changed
  - Uploads GitHub Release assets

```yaml
on:
  push:
    branches: [main]
jobs:
  version-pr: changeset version
  detect-release: compare package.json versions
  build: build macOS arm64, macOS x64, Linux x64 binaries
  publish: create tag, GitHub Release, and upload binaries
```

### 9. Install Script (`install.sh`)

- Bash script modeled after OpenCode's install script
- CLI flags: `-h/--help`, `-v/--version <ver>`, `-b/--binary <path>`, `--no-modify-path`
- Auto-detects OS (macOS/Linux) and architecture (arm64/x64) with Rosetta detection
- Fetches latest version from GitHub API or pins with `VERSION` env var / `--version` flag
- Installs to `$HOME/.local/bin` by default (no sudo needed); configurable via `INSTALL_DIR`
- Progress bar for downloads with fallback
- Adds to `$PATH` via `.zshrc`/`.bashrc`/`config.fish`
- Version skip: if same version already installed, exits quietly
- Pre-install version check — skips download if already up to date
- GitHub Actions support — adds to `$GITHUB_PATH`

### 10. Update Notification (inside TUI)

- `src/utils/update-check.ts` — fetches latest release tag from GitHub Releases API
  - Async, non-blocking on startup
  - 24-hour cache to avoid rate limits
  - Compares against current version (injected at build time)
  - Returns `UpdateInfo` with `updateAvailable`, `currentVersion`, `latestVersion`
- `src/tui/app.ts` — fires the update check asynchronously after the dashboard mounts
  - On resolution, if an update is available, sets a notification `Text` node at the top of the TUI
  - Notification shows the current version, new version, and the install script command
- `src/cli/commands/upgrade.ts` — `wtc upgrade --check` prints the same info to stdout
  - No self-upgrade (no binary download + replace) — MVP only notifies

(Install script is the only distribution method — no Homebrew formula.)

### 12. Documentation

- `AGENTS.md` — conventions, commands, tech stack
- `CONTRIBUTING.md` — how to set up dev environment, run tests, make PRs
- `README.md` — full rewrite with install instructions, usage, development guide

---

## Deliverables

At the end of MVP:

- [x] Source code compiles and runs (`bun dev` shows dashboard)
- [x] Linting passes (`bun run lint`)
- [x] Formatting passes (`bun run fmt:check`)
- [x] TypeScript type-checks (`bun run check`)
- [x] Tests pass (`bun test`)
- [x] Pre-commit hook works (husky + lint-staged)
- [x] CI pipeline configured (`.github/workflows/ci.yml`)
- [x] Changesets configured (`.changeset/`)
- [x] Unified Changesets + release pipeline configured (`.github/workflows/release.yml`)
- [x] Binary builds locally (`bun run build`)
- [x] Install script created (`install.sh`)
- [x] `README.md`, `AGENTS.md`, `CONTRIBUTING.md` written
- [x] Update checker + TUI notification
- [x] Design tokens (`src/tui/tokens.ts`) with brand colors
- [x] Modal component for update notifications
- [x] TUI update notification tested in alternate-screen mode
- [x] Install script tested end-to-end
- [x] Changesets release flow verified end-to-end with a test version PR/tag

---

## Follow-ups (moved to Phase 2)

- Self-upgrade (`wtc upgrade` command with binary download + atomic replace)
- Full Terraform-backed Amplify config
- Configuration layer with encrypted secrets (`src/api/config/`)
- Multi-platform build matrix in CI
- Teamwork API integration details
- Branch protection configuration via GitHub API
