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
- 🔨 **Phase 3.5:** Persistent TUI state and shared cache directory
- **Phase 4:** Teamwork Foundation
- **Phase 5:** GitHub repo creation
- **Phase 6:** AWS Amplify project bootstrapping
- **Phase 7:** Teamwork workflow expansion
- **Phase 8:** Full TUI dashboard polish
- **Phase 9:** Distribution polish

## Current Direction

The next major focus is Teamwork project workflow rather than GitHub creation.

Phase 4 will add:

- A Teamwork route with global and project-level tabs
- Settings-first editing for project links and Teamwork project configuration
- Project config shaped around domain sections such as `project.links` and `teamwork.projectId`
- Secure Teamwork API token storage through Bun's OS-backed secrets API
- TUI-based Teamwork token entry that stores the token securely without displaying the saved value
- `wtc config auth` commands for setting, checking, and deleting provider credentials
- A minimal Teamwork API client and purpose-built project metadata cache

Dynamic task/timer workflows will come after the foundation: showing project tasks assigned to the user, starting/stopping timers, and creating branches or PRs from Teamwork tasks.

See [plans/PLAN.md](plans/PLAN.md) for the full roadmap.

## License

MIT
