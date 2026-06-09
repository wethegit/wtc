# Development Guide

## Prerequisites

- [Bun](https://bun.sh) >= 1.2

## Setup

```bash
bun install
bun run prepare  # Initialize husky pre-commit hooks
```

## Development Workflow

1. Create a feature branch: `git checkout -b feature/TASK-0001-my-feature`
2. Make changes
3. Run checks locally:
   ```bash
   bun run lint       # No lint errors
   bun run fmt:check  # No formatting issues
   bun run check      # TypeScript compiles
   bun test           # All tests pass
   ```
4. Commit using conventional commits
5. Push and open a PR

## Running the TUI

```bash
bun run dev
```

This runs the TypeScript source directly with Bun's watch mode.

## Building a Standalone Binary

```bash
bun run build
```

Output: `wtc-<platform>-<arch>` in the project root.

## Project Architecture

See [architecture.md](architecture.md) for detailed architecture documentation.
