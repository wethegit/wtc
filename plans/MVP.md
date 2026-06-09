# MVP — Hello World Dashboard

The minimum viable product: a CLI tool that installs via Homebrew (and direct binary),
runs with the `wtc` command, and displays a basic TUI dashboard.

**Goal:** Get the full foundation in place — tooling, CI/CD, distribution, and a working binary.

---

## Tasks

### 1. Project Scaffolding
- Create directory structure as defined in PLAN.md
- Install dependencies:
  - Runtime: `yargs`, `@types/yargs`, `zod`
  - Dev: `oxlint`, `husky`, `lint-staged`, `@types/bun`
- Configure `oxlintrc.json`
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
    "build": "bun run scripts/build.ts"
  }
}
```

### 3. CLI Entry Point (`src/index.ts` + `src/cli/parser.ts`)
- `wtc` (no args) → launches TUI dashboard
- `wtc --version` → prints version
- `wtc --help` → prints help
- Uses yargs for argument parsing
- MVP only implements the empty-args path

### 4. TUI Dashboard (`src/tui/app.tsx` + `src/tui/pages/dashboard.tsx`)
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

### 5. Configuration Layer (`src/config/`)
- `schema.ts` — Zod schema for config.json
- `crypto.ts` — `encrypt(plaintext, password)` / `decrypt(ciphertext, password)`
  - PBKDF2 with 600k iterations → 256-bit key
  - AES-256-GCM encrypt
  - Returns serializable object `{ salt, iv, authTag, data }`
- `manager.ts` — `initConfig()`, `loadConfig()`, `saveConfig()`
  - Creates `~/.config/wtc/` directory if missing
  - On first run: prompts for master password, then prompts for config values
  - MVP: store minimal config (just enough to test encryption works)

### 6. Test Suite (`tests/`)
- `tests/config/crypto.test.ts` — encrypt/decrypt round-trip
- `tests/config/manager.test.ts` — config load/save
- `tests/tui/dashboard.test.ts` — using `@opentui/core/testing`:
  ```ts
  import { createTestRenderer } from "@opentui/core/testing"
  // render dashboard, capture frame, assert content
  ```

### 7. Build Script (`scripts/build.ts`)
- Uses `Bun.build()` with `--compile` target
- Platform detection: build for current platform
- Output: `./wtc` (or `./wtc.exe`)
- Use Bun's standalone executable feature

### 8. CI Pipeline (`.github/workflows/ci.yml`)
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

### 9. Release Pipeline (`.github/workflows/release.yml`)
```yaml
on:
  push:
    tags: "v*"
jobs:
  build-macos-arm64:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun install --os="*" --cpu="*" @opentui/core  # cross-platform native pkgs
      - run: bun run scripts/build.ts
      - uses: softprops/action-gh-release@v2
        with:
          files: wtc-*
  # similar for macos-x64, linux-x64-glibc
```

### 10. Homebrew Formula (`homebrew/wtc.rb`)
```ruby
class Wtc < Formula
  desc "CLI tool for managing GitHub, AWS Amplify, and Teamwork"
  homepage "https://github.com/anomalyco/homebrew-wtc"
  version "0.1.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/anomalyco/homebrew-wtc/releases/download/v#{version}/wtc-darwin-arm64"
      sha256 "..."
    else
      url "https://github.com/anomalyco/homebrew-wtc/releases/download/v#{version}/wtc-darwin-x64"
      sha256 "..."
    end
  end

  on_linux do
    url "https://github.com/anomalyco/homebrew-wtc/releases/download/v#{version}/wtc-linux-x64"
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

### 11. Documentation
- `AGENTS.md` — conventions, commands, tech stack
- `CONTRIBUTING.md` — how to set up dev environment, run tests, make PRs
- `README.md` — full rewrite with install instructions, usage, development guide

---

## Deliverables

At the end of MVP:

- [ ] Source code compiles and runs (`bun dev` shows dashboard)
- [ ] Linting passes (`bun run lint`)
- [ ] Formatting passes (`bun run fmt:check`)
- [ ] TypeScript type-checks (`bun run check`)
- [ ] Tests pass (`bun test`)
- [ ] Pre-commit hook works (husky + lint-staged)
- [ ] CI passes on GitHub (push/PR)
- [ ] Binary builds locally (`bun run build`)
- [ ] Release workflow creates GitHub Release with binary
- [ ] Homebrew formula works (`brew install` from local formula)
- [ ] `README.md`, `AGENTS.md`, `CONTRIBUTING.md` written

---

## Open Questions for After MVP
- Full Terraform-backed Amplify config
- Multi-platform build matrix in CI
- AUR PKGBUILD creation
- Teamwork API integration details
- Branch protection configuration via GitHub API
