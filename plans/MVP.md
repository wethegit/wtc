# MVP — Hello World Dashboard

The minimum viable product: a CLI tool that installs universally (install script, Homebrew, or direct binary),
runs with the `wtc` command, and displays a basic TUI dashboard with built-in update notifications.

**Goal:** Get the full foundation in place — tooling, CI/CD, distribution (install script + Homebrew + AUR + GitHub Releases),
self-update capability, and a working binary.

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
- MVP only implements the empty-args path

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
  - Updates Homebrew and AUR package checksums

```yaml
on:
  push:
    branches: [main]
jobs:
  version-pr: changeset version
  detect-release: compare package.json versions
  build: build macOS arm64, macOS x64, Linux x64 binaries
  publish: create tag, GitHub Release, and package checksum commit
```

### 9. Install Script (`install.sh`)

- Bash script that auto-detects OS (macOS/Linux) and architecture (arm64/x64)
- Downloads the correct binary from the latest GitHub Release
- Supports `VERSION` env var for pinning: `VERSION=v1.2.3 install.sh`
- Installs to `/usr/local/bin/wtc` by default (configurable via `INSTALL_DIR`)
- Idempotent — re-running updates to the latest version

### 10. Update Checker + Self-Upgrade

- `src/utils/update-check.ts` — fetches latest release tag from GitHub Releases API
  - Async, non-blocking on startup
  - 24-hour cache to avoid rate limits
  - Compares against current version (injected at build time)
  - Returns "update available" message if newer
- `src/cli/commands/upgrade.ts` — `wtc upgrade` command
  - Detects its own binary path (`/proc/self/exe`, `which wtc`)
  - Downloads latest binary from GitHub Releases
  - Replaces itself atomically
  - Refuses to replace Homebrew or pacman/AUR-managed binaries; those must be updated with their package manager
  - `wtc upgrade --check` just checks without upgrading
- `src/cli/parser.ts` — registers the `upgrade` subcommand

### 11. Homebrew Formula (`Formula/wtc.rb`)

```ruby
class Wtc < Formula
  desc "CLI tool for managing GitHub, AWS Amplify, and Teamwork"
  homepage "https://github.com/wethegit/homebrew-wtc"
  version "0.1.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/wethegit/homebrew-wtc/releases/download/v#{version}/wtc-darwin-arm64"
      sha256 "..."
    else
      url "https://github.com/wethegit/homebrew-wtc/releases/download/v#{version}/wtc-darwin-x64"
      sha256 "..."
    end
  end

  on_linux do
    url "https://github.com/wethegit/homebrew-wtc/releases/download/v#{version}/wtc-linux-x64"
    sha256 "..."
  end

  def install
    bin.install Dir["wtc-*"].first => "wtc"
  end

  test do
    assert_match "wtc", shell_output("#{bin}/wtc --version")
  end
end
```

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
- [x] Homebrew formula created (`Formula/wtc.rb`)
- [x] Install script created (`install.sh`)
- [x] `README.md`, `AGENTS.md`, `CONTRIBUTING.md` written
- [x] Update checker + `wtc upgrade` command
- [ ] Install script tested end-to-end
- [ ] Changesets release flow verified end-to-end with a test version PR/tag

---

## Open Questions for After MVP

- Full Terraform-backed Amplify config
- Configuration layer with encrypted secrets (`src/config/`)
- Multi-platform build matrix in CI
- AUR PKGBUILD release publishing
- Teamwork API integration details
- Branch protection configuration via GitHub API
