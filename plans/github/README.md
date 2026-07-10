# GitHub Repo Creation Plan

GitHub repo creation is split into focused subphase documents so `plans/PLAN.md` stays readable.

## Subphases

- [6.1 TUI Repo Creation From Template](6.1-tui-repo-creation-from-template.md) ✅: create a GitHub repo from an approved org template through the TUI with rules preset selection.
- [6.2 CLI Repo Creation](6.2-cli-repo-creation.md) ✅: CLI `wtc repo create` command with `--template`, `--visibility`, `--description`, `--rules-preset`, and `--json`.
- [6.3 Repo Rules](6.3-repo-rules.md) ✅: branch protection rulesets, repository settings, vulnerability alerts, and senior-reviewers bypass.
- [6.4 Local Clone + WTC Project Bootstrap](6.4-local-clone-and-wtc-project-bootstrap.md) ✅: clone the repo and write `.wtc.yaml` into it with Teamwork project ID and optional Teamwork references.
- [6.5 Teamwork Project Linking + Final Polish](6.5-teamwork-project-linking-and-final-polish.md): link the created repo into WTC project config from the old working directory and add remaining workflow conveniences.

## Implementation Order

1. ✅ TUI repo creation from templates (6.1).
2. ✅ CLI repo creation parity (6.2).
3. ✅ Repo rules, repository settings, vulnerability alerts, and rulesets (6.3).
4. ✅ Clone the newly created repo, write `.wtc.yaml` with Teamwork context, and push the config commit (6.4).
5. Link the created repo into the old working directory's `.wtc.yaml` and add remaining workflow polish (6.5).

## Shared Rules

- GitHub token storage stays in OS secrets through `src/api/github/auth.ts`.
- GitHub API access stays behind `src/api/github/client.ts` and Octokit.
- Repo creation uses the code-owned company GitHub org constant `wethegit`.
- Phase 6.1 creates repos only under `wethegit` and lists templates only from that same owner.
- Template lists include only repositories with `is_template === true`.
- Template discovery is cached for 24 hours because org templates rarely change; clearing the WTC cache forces a refresh.
- Repo creation from templates uses `include_all_branches: false`.
- Do not add tests.
