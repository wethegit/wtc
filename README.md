# WTC — Workflow Terminal Controller

A terminal UI tool for developers to manage GitHub repos, AWS Amplify projects, and Teamwork tasks.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/wethegit/wtc/main/install.sh | bash
```

## Usage

```bash
# Launch the TUI dashboard
wtc

# Show help
wtc --help
```

## Updating

`wtc` checks for a newer version on every launch and shows a notification in the TUI with update commands. Or check manually:

```bash
wtc upgrade --check
```

To update, re-run the install script.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup instructions.

## Project Status

- ✅ **Phase 1 (MVP):** Foundation, tooling, CI/CD, and distribution
- ✅ **Phase 2:** Solid/OpenTUI refactor with command palette and Settings route
- ✅ **Phase 3:** YAML config setup with user/project config files
- ✅ **Phase 4:** Persistent TUI state and shared cache directory
- ✅ **Phase 5:** Teamwork workflow (5.1–5.4 complete; 5.5 in progress)
- **Phase 6:** GitHub repo creation
- **Phase 7:** AWS Amplify project bootstrapping
- **Phase 8:** Full TUI dashboard polish
- **Phase 9:** Distribution polish

See [plans/PLAN.md](plans/PLAN.md) for the full roadmap.

## License

MIT
