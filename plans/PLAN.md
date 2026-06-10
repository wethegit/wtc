# wtc — Development Roadmap

A terminal UI tool for developers to manage GitHub repos, AWS Amplify projects, and Teamwork tasks.

- **Status:** Planning
- **Package Manager:** Bun
- **Runtime:** Bun (standalone binary distribution)
- **TUI:** @opentui/core (functional API)
- **Repository:** homebrew-wtc

---

## Tech Stack

| Concern           | Choice                            | Rationale                                   |
| ----------------- | --------------------------------- | ------------------------------------------- |
| Language          | TypeScript (strict)               | Type safety, team familiarity               |
| Runtime           | Bun                               | OpenTUI native, fast, standalone binaries   |
| TUI               | @opentui/core                     | No JSX overhead, command-invocable          |
| CLI parser        | yargs 18.x                        | Patterns match OpenCode, robust subcommands |
| Linter            | oxlint                            | 700+ TS rules, Rust-native, fast            |
| Formatter         | oxfmt                             | Pairs with oxlint, zero config              |
| Test runner       | bun test + @opentui/core/testing  | Built-in, no extra deps                     |
| Pre-commit        | husky + lint-staged               | Runs oxlint + oxfmt on staged files         |
| CI/CD             | GitHub Actions                    | Tight GitHub integration                    |
| Release versions  | Changesets                        | Version PRs, changelog, automated tags      |
| Encryption        | Web Crypto (AES-256-GCM + PBKDF2) | Built-in, no extra deps                     |
| Config validation | zod                               | Schema validation for config.json           |
| Distribution      | Install script + GitHub Releases  | Universal Linux, macOS                      |

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
│   │       ├── config.ts
│   │       └── upgrade.ts        # `wtc upgrade --check` — version check
│   ├── tui/
│   │   ├── app.ts            # Main TUI app shell
│   │   ├── components/       # Reusable TUI components
│   │   │   ├── status-bar.ts
│   │   │   ├── sidebar.ts
│   │   │   └── forms/
│   │   └── pages/            # TUI screens
│   │       ├── dashboard.ts
│   │       ├── github.ts
│   │       ├── amplify.ts
│   │       ├── teamwork.ts
│   │       └── settings.ts
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
│       ├── errors.ts         # Error types
│       └── update-check.ts   # Version check against GitHub Releases
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
├── .changeset/
│   ├── config.json            # Changesets configuration
│   └── README.md              # Changesets contributor notes
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
│   │   └── release.yml       # Changesets version PR + build + publish
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

- Tooling: oxlint, oxfmt, husky, lint-staged, CI, pre-commit hooks
- TUI dashboard with "Hello World" display
- CLI parser with yargs (supports `wtc` + subcommands)
- Build script for standalone binary
- Install script (`install.sh`) for universal distribution
- Built-in update notification (`wtc upgrade --check`, TUI banner on launch)
- Changesets-based version PRs and automated release tags
- Release pipeline with binary builds
- Documentation: README, AGENTS.md, CONTRIBUTING.md, plans/

See `MVP.md` for detailed deliverables.

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
- Configuration layer with encrypted secrets
- Status bar (timer status, git branch, AWS profile)

### Phase 6 — Distribution Polish

- Documentation site or expanded docs
- Release automation refinements
- Self-upgrade command (`wtc upgrade` with binary download + atomic replace)

---

## Update Mechanism

`wtc` includes a built-in update system so users who install via the install script or direct binary get notified when a new version is available.

### How It Works

1. **Version check on launch**: On startup, `wtc` fetches the latest release tag from the GitHub Releases API (`api.github.com/repos/wethegit/homebrew-wtc/releases/latest`). This is done asynchronously so it never blocks startup.
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

| Method          | Platforms                    | Install command                                                                              |
| --------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Install script  | Universal (any Linux, macOS) | `curl -fsSL https://raw.githubusercontent.com/wethegit/homebrew-wtc/main/install.sh \| bash` |
| GitHub Releases | All                          | Download from releases page                                                                  |

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
