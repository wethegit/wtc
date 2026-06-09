# WTC — Workflow Terminal Controller

A terminal UI tool for developers to manage GitHub repos, AWS Amplify projects, and Teamwork tasks.

## Installation

### macOS / Linux (Homebrew)

```bash
brew install wethegit/wtc/wtc
```

### All platforms (install script)

```bash
curl -fsSL https://raw.githubusercontent.com/wethegit/homebrew-wtc/main/install.sh | bash
```

## Usage

```bash
# Launch the TUI dashboard
wtc

# Show help
wtc --help
```

## Updating

```bash
# Check whether a newer release exists
wtc upgrade --check

# Direct binary / install-script installs only
wtc upgrade
```

Package-manager installs should be updated through the package manager:

```bash
brew upgrade wtc  # Homebrew
```

`wtc upgrade` refuses to replace Homebrew-managed binaries.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup instructions.

## Project Status

- **Phase 1 (MVP):** Hello World dashboard with tooling, CI/CD, and distribution
- **Phase 2:** GitHub repo creation
- **Phase 3:** AWS Amplify project bootstrapping
- **Phase 4:** Teamwork API integration
- **Phase 5:** Full TUI dashboard with navigation
- **Phase 6:** Distribution polish

See [plans/PLAN.md](plans/PLAN.md) and [plans/MVP.md](plans/MVP.md) for the full roadmap.

## License

MIT
