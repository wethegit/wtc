# Changesets

This project uses Changesets to manage version bumps and release notes.

Run `bun run changeset` from a feature or fix branch when your change should be released.

Do not edit `package.json` versions manually in regular feature PRs. After feature PRs merge to `main`, Changesets opens a version PR that updates `package.json` and `CHANGELOG.md`.
