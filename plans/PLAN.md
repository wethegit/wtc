# wtc — Development Roadmap

A terminal UI tool for developers to manage GitHub repos, AWS Amplify projects, and Teamwork tasks.

- **Status:** Planning
- **Package Manager:** Bun
- **Runtime:** Bun (standalone binary distribution)
- **TUI:** @opentui/core (functional API)
- **Repository:** homebrew-wtc

---

## Tech Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Language | TypeScript (strict) | Type safety, team familiarity |
| Runtime | Bun | OpenTUI native, fast, standalone binaries |
| TUI | @opentui/core | No JSX overhead, command-invocable |
| CLI parser | yargs 18.x | Patterns match OpenCode, robust subcommands |
| Linter | oxlint | 700+ TS rules, Rust-native, fast |
| Formatter | oxfmt | Pairs with oxlint, zero config |
| Test runner | bun test + @opentui/core/testing | Built-in, no extra deps |
| Pre-commit | husky + lint-staged | Runs oxlint + oxfmt on staged files |
| CI/CD | GitHub Actions | Tight GitHub integration |
| Encryption | Node crypto (AES-256-GCM + PBKDF2) | Built-in, no extra deps |
| Config validation | zod | Schema validation for config.json |
| Distribution | Homebrew + AUR | macOS + Linux (Arch) |

---

## Architecture

### Directory Structure

```
homebrew-wtc/
├── src/
│   ├── index.ts              # Entry point — CLI parser or TUI
│   ├── cli/
│   │   ├── parser.ts         # yargs command definitions
│   │   └── commands/         # Subcommand handlers
│   │       ├── github.ts
│   │       ├── amplify.ts
│   │       ├── teamwork.ts
│   │       └── config.ts
│   ├── tui/
│   │   ├── app.tsx           # Main TUI app shell
│   │   ├── components/       # Reusable TUI components
│   │   │   ├── status-bar.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── forms/
│   │   └── pages/            # TUI screens
│   │       ├── dashboard.tsx
│   │       ├── github.tsx
│   │       ├── amplify.tsx
│   │       ├── teamwork.tsx
│   │       └── settings.tsx
│   ├── config/
│   │   ├── manager.ts        # CRUD for ~/.config/wtc/config.json
│   │   ├── crypto.ts         # Encrypt/decrypt config
│   │   └── schema.ts         # Zod schemas
│   ├── api/
│   │   ├── github.ts         # Octokit client
│   │   ├── amplify.ts        # AWS SDK client
│   │   ├── teamwork.ts       # Teamwork REST client
│   │   └── aws-profiles.ts   # Parse ~/.aws/credentials
│   └── utils/
│       ├── branch.ts         # Branch name parsing
│       ├── browser.ts        # Open URL in system browser
│       └── errors.ts         # Error types
├── scripts/
│   ├── build.ts              # Bun.build --compile wrapper
│   └── release.ts            # Tag/release helper
├── tests/
│   ├── config/
│   │   ├── manager.test.ts
│   │   ├── crypto.test.ts
│   │   └── schema.test.ts
│   ├── api/
│   │   ├── github.test.ts
│   │   ├── amplify.test.ts
│   │   └── teamwork.test.ts
│   └── tui/
│       └── components.test.ts
├── homebrew/
│   └── wtc.rb                # Homebrew formula
├── aur/
│   └── PKGBUILD              # Arch Linux package build
├── docs/
│   ├── architecture.md
│   ├── development.md
│   ├── usage.md
│   └── releases.md
│
├── AGENTS.md                 # AI agent instructions
├── CONTRIBUTING.md           # Contributor guide
├── oxlintrc.json             # Oxlint config
├── .husky/
│   └── pre-commit            # Pre-commit hook
├── .lintstagedrc.json        # lint-staged config
├── .github/
│   ├── workflows/
│   │   ├── ci.yml            # Lint + typecheck + test
│   │   └── release.yml       # Build + publish
│   └── dependabot.yml
├── package.json
├── tsconfig.json
└── README.md
```

### Config File: `~/.config/wtc/config.json`

```json
{
  "version": 1,
  "encrypted": {
    "salt": "<hex>",
    "iv": "<hex>",
    "authTag": "<hex>",
    "data": "<hex>"
  },
  "plain": {
    "aws": {
      "profile": "default"
    },
    "github": {
      "org": "my-org"
    },
    "teamwork": {
      "domain": "my-team.teamwork.com"
    }
  }
}
```

Decrypted `data` contains:

```json
{
  "github": { "token": "ghp_..." },
  "teamwork": { "apiKey": "tw-..." }
}
```

### Per-Repo Config: `.wtc.json`

```json
{
  "teamworkProjectId": 12345
}
```

---

## Phases

### Phase 1 — Foundation (MVP)
See `MVP.md`

### Phase 2 — GitHub Repo Creation
- `wtc repo create` command + TUI form
- Fetch org templates via GitHub API
- Create repo from template (source files only; settings like branch protection are NOT copied)
- Set up branch protection via GitHub API after creation
- Optionally clone locally
- Link repo to Teamwork project (writes `.wtc.json`)

### Phase 3 — AWS Amplify Hosting
- `wtc amplify create` command + TUI form
- Use @aws-sdk/client-amplify to create Amplify app
- Configure custom domain, branch auto-connection/disconnection
- Build settings from template repo's amplify.yml
- "Help" link to internal Notion docs for AWS setup
- Profile-based auth from ~/.aws/credentials
- Full Terraform-backed config (details TBD)

### Phase 4 — Teamwork Integration
- Task ↔ PR linking by parsing branch names (`(feature|fix|chore)/TASK-XXXXX`)
- `wtc teamwork timer start|stop|pause`
- `wtc teamwork link` — link current branch to Teamwork task
- `wtc teamwork open` — open task in browser
- Timer overview TUI page (active/paused timers)
- Notification popup on timer events
- Project↔Repo mapping in local config + per-repo `.wtc.json`

### Phase 5 — TUI Dashboard
- Sidebar navigation between GitHub, Amplify, Teamwork, Settings
- Timer overview page
- Settings page (view config, links to Notion guides)
- Status bar (timer status, git branch, AWS profile)

### Phase 6 — Distribution Polish
- Homebrew formula updates
- AUR PKGBUILD
- Documentation site or expanded docs
- Release automation refinements

---

## CI/CD Pipelines

### CI (ci.yml) — Every push/PR
```
oxlint --all
tsc --noEmit
bun test
```

### Release (release.yml) — Tag push (v*)
```
Build: bun build --compile (macOS arm64, macOS x64, Linux x64 glibc)
Upload: attach binaries to GitHub Release
Formula: update homebrew/wtc.rb with new version + shas
AUR: update aur/PKGBUILD with new version + sha256
```

---

## Distribution

| Platform | Method | Notes |
|----------|--------|-------|
| macOS (Intel) | Homebrew | `brew install anomalyco/tap/wtc` |
| macOS (Apple Silicon) | Homebrew | Same formula, universal binary |
| Linux (x64 glibc) | Homebrew | Homebrew on Linux supports this |
| Linux (Arch) | AUR | `yay -S wtc` or similar |

All binaries are standalone — no Bun runtime required by end users.

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
