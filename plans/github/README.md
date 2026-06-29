# GitHub Repo Creation Plan

GitHub repo creation is split into focused subphase documents so `plans/PLAN.md` stays readable.

## Subphases

- [6.1 TUI Repo Creation From Template](6.1-tui-repo-creation-from-template.md): create a GitHub repo from an approved org template through the TUI.
- [6.2 CLI Repo Creation](6.2-cli-repo-creation.md): add a CLI equivalent of the 6.1 TUI flow.
- [6.3 Repo Rules](6.3-repo-rules.md): add branch protection, PR rules, and repository settings to the creation flow.
- [6.4 Teamwork Project Linking](6.4-teamwork-project-linking.md): link created GitHub repos into WTC project config.
- [6.5 Local Clone and Final Features](6.5-local-clone-and-final-features.md): clone locally and add final repo creation workflow conveniences.

## Implementation Order

1. Add the minimal config and API needed for TUI repo creation from templates.
2. Build the TUI workflow on the GitHub page.
3. Add CLI parity after the TUI workflow proves the data shape and user interaction.
4. Add repo rules only after basic creation is stable.
5. Add Teamwork/project linking after repo rules are clear.
6. Add cloning and final workflow polish last.

## Shared Rules

- GitHub token storage stays in OS secrets through `src/api/github/auth.ts`.
- GitHub API access stays behind `src/api/github/client.ts` and Octokit.
- Repo creation reads `github.repoOwner` from user config.
- `github.repoOwner` starts blank; Settings should use `wethegit` as the placeholder/example.
- Phase 6.1 creates repos only under `github.repoOwner` and lists templates only from that same owner.
- Template lists include only repositories with `is_template === true`.
- Repo creation from templates uses `include_all_branches: false`.
- Do not add CLI commands until Phase 6.2.
- Do not add cloning until Phase 6.5.
- Do not add tests.
