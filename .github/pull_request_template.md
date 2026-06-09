## Summary

-

## Type of Change

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Tooling / CI / release

## Local Verification

- [ ] `bun run lint`
- [ ] `bun run fmt:check`
- [ ] `bun run check`
- [ ] `bun test`
- [ ] `bun run build` if this affects CLI, install, release, update, or native TUI packaging behavior

## Release Impact

- [ ] No release impact
- [ ] Changeset added in `.changeset/`
- [ ] Updates CLI behavior
- [ ] Updates install/update behavior
- [ ] Updates build/release packaging
- [ ] Breaking change

## Notes

- Do not commit generated binaries or release artifacts.
- Do not edit `package.json` versions manually in feature/fix PRs.
- Releases are created by merging the automated Changesets version PR.
