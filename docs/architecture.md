# Architecture

## Entry Point

`src/index.ts` is the single entry point. It delegates to the CLI parser (`src/cli/parser.ts`).

## CLI Parser

Uses **yargs** to handle argument parsing. Two modes:
- `wtc` (no args) — launches the interactive TUI dashboard
- `wtc <subcommand>` — runs headless commands (Phase 2+)

## TUI Layer

Built with `@opentui/core` (functional API). The TUI is organized as:
- **`app.tsx`** — creates the renderer and mounts the root component
- **`pages/`** — screen-level views (dashboard, github, amplify, teamwork, settings)
- **`components/`** — reusable UI elements (status-bar, sidebar, forms)

## Config Layer

User configuration is stored at `~/.config/wtc/config.json`. Secrets (GitHub PAT, Teamwork API key) are encrypted with a master password using AES-256-GCM with PBKDF2 key derivation.

## API Layer

Each external service has its own client module:
- **`api/github.ts`** — Octokit client using the user's PAT
- **`api/amplify.ts`** — AWS SDK client using profile-based credentials
- **`api/teamwork.ts`** — Teamwork REST API client using API key + domain

## Distribution

Binaries are built with `bun build --compile` which produces standalone executables (no Bun runtime needed by end users).

Supported platforms:
- macOS ARM64 (Apple Silicon)
- macOS x64 (Intel)
- Linux x64 (glibc)
