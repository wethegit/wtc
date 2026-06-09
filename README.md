# WTC — Workflow Terminal Controller

A terminal UI tool for developers to manage GitHub repos, AWS Amplify projects, and Teamwork tasks.

## Installation

### macOS (Homebrew)

```bash
brew install anomalyco/tap/wtc
```

### Linux (Homebrew)

```bash
brew install anomalyco/tap/wtc
```

### Linux (Arch Linux via AUR)

```bash
yay -S wtc
```

### Direct Binary

Download the appropriate binary from the [releases page](https://github.com/anomalyco/homebrew-wtc/releases), make it executable, and place it in your `PATH`.

```bash
chmod +x wtc-*
mv wtc-* /usr/local/bin/wtc
```

## Usage

```bash
# Launch the TUI dashboard
wtc

# Show version
wtc --version

# Show help
wtc --help
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
