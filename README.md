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

`wtc` checks for a newer version on every launch and shows a notification in the TUI with update commands.

```bash
# Homebrew
brew upgrade wtc

# Install script
curl -fsSL https://raw.githubusercontent.com/wethegit/homebrew-wtc/main/install.sh | bash
```

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
