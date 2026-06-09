# Changesets

This project uses Changesets to manage version bumps and release notes.

Run `bun run changeset` from a feature or fix branch when your change should be released.

Do not edit `package.json` versions manually in regular feature PRs. After feature PRs merge to `main`, `.github/workflows/release.yml` opens a Changesets version PR that updates `package.json` and `CHANGELOG.md`.

Merging the version PR triggers the release jobs in the same workflow: tag creation, binary builds, GitHub Release assets, and package checksum updates.
