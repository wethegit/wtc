# Contributing

## Requirements

- [Bun](https://bun.com/)

Useful resources:

- [OpenTUI Docs](https://opentui.com/)

## Development Setup

```bash
# Clone the repository
git clone https://github.com/wethegit/wtc.git
cd wtc

# Install dependencies
bun install

# Set up pre-commit hooks
bun run prepare
```

## Available Commands

```bash
bun run dev          # Watch mode development
bun run lint         # Run oxlint
bun run fmt          # Format with oxfmt
bun run fmt:check    # Check formatting
bun run check        # Typecheck with tsc --noEmit
bun test             # Run tests
bun run build        # Build standalone binary
bun run changeset    # Add a release changeset
```

## Building Binaries

Build a standalone binary for your current platform:

```bash
bun run build
```

The output is written to `dist/` using this naming scheme:

```bash
dist/wtc-<platform>-<arch>
```

Supported targets:

| Platform | Arch  | Binary name        |
| -------- | ----- | ------------------ |
| macOS    | arm64 | `wtc-darwin-arm64` |
| macOS    | x64   | `wtc-darwin-x64`   |
| Linux    | x64   | `wtc-linux-x64`    |

Override the target when building release binaries:

```bash
WTC_TARGET_PLATFORM=darwin WTC_TARGET_ARCH=arm64 bun run build
WTC_TARGET_PLATFORM=darwin WTC_TARGET_ARCH=x64 bun run build
WTC_TARGET_PLATFORM=linux WTC_TARGET_ARCH=x64 bun run build
```

Before cross-platform release builds, install OpenTUI's optional native packages:

```bash
bun install --os="*" --cpu="*" @opentui/core
```

## Running Built Binaries

Run the generated binary directly from the repository root:

```bash
cd ./dist
wtc-linux-x64 --version
wtc-linux-x64 --help
wtc-linux-x64
```

Use the filename that matches your platform. The dashboard starts with no arguments. Press `Ctrl+C` to exit.

## CI/CD and Releases

CI runs automatically on pull requests targeting `main`.

The CI workflow installs dependencies with Bun and runs:

```bash
bun run lint
bun run fmt:check
bun run check
bun test
```

Before opening a pull request, run the same checks locally. If your change affects the CLI entry point, release packaging, installation, TUI update notification, or OpenTUI native bundling, also run:

```bash
bun run build
```

This project uses Changesets for release notes and version bumps. Contributors should not edit `package.json` versions directly in feature or fix PRs. If a change should be released, add a changeset from your branch:

```bash
bun run changeset
```

Choose the correct bump type:

| Bump    | Use for                                          |
| ------- | ------------------------------------------------ |
| `patch` | Bug fixes and small backwards-compatible changes |
| `minor` | New backwards-compatible functionality           |
| `major` | Breaking changes                                 |

This creates a Markdown file in `.changeset/`. Commit that file with your PR. Documentation-only, test-only, and internal tooling-only changes may skip a changeset if they should not create a release.

After PRs with changesets merge to `main`, the release workflow opens or updates a Changesets version PR. That version PR updates `package.json` and `CHANGELOG.md`.

When the Changesets version PR is merged to `main`, the same release workflow detects the package version change, creates the matching `v*` git tag, builds binaries, and uploads them to the GitHub Release. The binaries built are:

| Target      | Binary name        |
| ----------- | ------------------ |
| macOS ARM64 | `wtc-darwin-arm64` |
| macOS x64   | `wtc-darwin-x64`   |
| Linux x64   | `wtc-linux-x64`    |

Users install directly from the GitHub Release via the install script. No package manager (Homebrew, AUR, etc.) is packaged.

For changes intended to ship in a release:

1. Update source code, tests, and documentation in a pull request.
2. Run `bun run changeset` and commit the generated `.changeset/*.md` file.
3. Note any release impact in the pull request description.
4. Do not edit `package.json` versions manually.
5. Do not commit generated binaries or release artifacts.
6. Wait for CI to pass before requesting review.

Maintainers create releases by merging the Changesets version PR. Tag creation, binary builds, and GitHub Release assets are handled by `.github/workflows/release.yml`.

## Code Conventions

- Strict TypeScript — no `any`, no default exports
- `kebab-case.ts` file names, `PascalCase` types, `camelCase` functions
- `import type` for type-only imports
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Tests mirror `src/` structure under `tests/`

## Pull Requests

1. Create a branch from `main`
2. Make your changes
3. Add a changeset with `bun run changeset` if the change should be released
4. Ensure `bun run lint`, `bun run fmt:check`, `bun run check`, and `bun test` pass
5. Run `bun run build` when your change affects build, release, install, update, or native TUI packaging behavior
6. Open a PR against `main` using the PR template

## Before Committing

Pre-commit hooks will automatically run linting and formatting on staged files.
