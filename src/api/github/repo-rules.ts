import type { RestEndpointMethodTypes } from "@octokit/rest";

type CreateGitHubRepoRulesetParameters =
  RestEndpointMethodTypes["repos"]["createRepoRuleset"]["parameters"];

interface GitHubRepoRulesetPresetInput {
  /** Organization that owns the new repository. */
  owner: string;
  /** Repository name without the owner prefix. */
  repo: string;
  /** Numeric GitHub team ID resolved at runtime from the configured bypass team slug. */
  bypassTeamId: number;
}

type GitHubRepoRulesetPreset = (
  input: GitHubRepoRulesetPresetInput,
) => CreateGitHubRepoRulesetParameters;

/**
 * GitHub repository ruleset presets available during repo creation.
 *
 * Keep policy here instead of in the TUI or CLI so branch protection changes are
 * easy to audit and new presets can be added without touching Octokit call sites.
 */
export const GITHUB_REPO_RULESET_PRESETS = {
  standard: ({ owner, repo, bypassTeamId }) => ({
    owner,
    repo,
    name: "WTC protected branches",
    target: "branch",
    enforcement: "active",
    bypass_actors: [
      {
        actor_id: bypassTeamId,
        actor_type: "Team",
        bypass_mode: "always",
      },
    ],
    conditions: {
      ref_name: {
        include: ["~DEFAULT_BRANCH", "refs/heads/release/*", "refs/heads/release-candidate/*"],
        exclude: [],
      },
    },
    rules: [
      {
        type: "pull_request",
        parameters: {
          allowed_merge_methods: ["merge", "squash", "rebase"],
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_approving_review_count: 1,
          required_review_thread_resolution: true,
        },
      },
      { type: "deletion" },
      { type: "non_fast_forward" },
    ],
  }),
} satisfies Record<string, GitHubRepoRulesetPreset>;

/** Selectable repo rules option; `none` still applies non-ruleset setup. */
export type GitHubRepoRulesPreset = "none" | keyof typeof GITHUB_REPO_RULESET_PRESETS;
