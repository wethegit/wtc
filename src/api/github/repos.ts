import { z } from "zod";

import { getCacheDir } from "../cache/consts.ts";
import { logError } from "../logs/manager.ts";
import { getOctokit } from "./client.ts";
import { GITHUB_RULES_BYPASS_TEAM_SLUG } from "./consts.ts";
import { GITHUB_REPO_RULESET_PRESETS, type GitHubRepoRulesPreset } from "./repo-rules.ts";
export type { GitHubRepoRulesPreset } from "./repo-rules.ts";

const TEMPLATE_REPOS_CACHE_FILE = "github-template-repos.json";
const TEMPLATE_REPOS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Applied during blank repo creation and again after creation so template-based
// repos converge on the same baseline settings.
const BASE_REPO_SETTINGS = {
  allow_squash_merge: true,
  allow_merge_commit: true,
  allow_rebase_merge: true,
  delete_branch_on_merge: true,
  has_projects: false,
  has_wiki: false,
  has_discussions: false,
};

const GitHubTemplateRepoSchema = z.object({
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable().optional(),
  htmlUrl: z.string(),
  private: z.boolean(),
});

const GitHubTemplateReposCacheFileSchema = z.object({
  version: z.literal(1),
  owners: z.record(
    z.string(),
    z.object({
      cachedAt: z.number(),
      repos: z.array(GitHubTemplateRepoSchema),
    }),
  ),
});

type GitHubTemplateReposCacheFile = z.infer<typeof GitHubTemplateReposCacheFileSchema>;

/** Template repository shown in the TUI repo creation flow. */
export interface GitHubTemplateRepo {
  owner: string;
  name: string;
  fullName: string;
  description?: string | null;
  htmlUrl: string;
  private: boolean;
}

/** Template source plus target repo settings for GitHub template generation. */
export interface CreateGitHubRepoFromTemplateInput extends CreateGitHubRepoInput {
  templateOwner: string;
  templateRepo: string;
}

/** Target repository fields shared by blank and template-based creation. */
export interface CreateGitHubRepoInput {
  owner: string;
  name: string;
  description?: string;
  private: boolean;
}

/** Post-create GitHub setup requested by the repo creation flow. */
export interface ApplyGitHubRepoSetupInput {
  owner: string;
  repo: string;
  /** `none` skips rulesets but still applies baseline repo settings and alerts. */
  rulesPreset: GitHubRepoRulesPreset;
}

/** Non-fatal post-create setup failures to show after the repo exists. */
export interface GitHubRepoSetupResult {
  warnings: string[];
}

/**
 * Combined input for creating a repo (template or blank) and applying post-create
 * setup in a single call. Both TUI and CLI use this to avoid duplicating the
 * create+setup workflow.
 */
export interface CreateGitHubRepoWithSetupInput extends CreateGitHubRepoInput {
  templateOwner?: string;
  templateRepo?: string;
  rulesPreset: GitHubRepoRulesPreset;
}

export interface CreateGitHubRepoWithSetupResult {
  repo: CreatedGitHubRepo;
  warnings: string[];
}

/** GitHub repository created by WTC. */
export interface CreatedGitHubRepo {
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
}

/** Gets template repositories for an owner, cached because org templates rarely change. */
export async function getGitHubTemplateRepos(owner: string): Promise<GitHubTemplateRepo[]> {
  let cache: GitHubTemplateReposCacheFile;
  try {
    cache = GitHubTemplateReposCacheFileSchema.parse(
      JSON.parse(await Bun.file(`${getCacheDir()}/${TEMPLATE_REPOS_CACHE_FILE}`).text()),
    );
  } catch {
    cache = { version: 1, owners: {} };
  }

  const now = Date.now();
  const cachedOwner = cache.owners[owner];
  if (cachedOwner && now - cachedOwner.cachedAt < TEMPLATE_REPOS_CACHE_TTL_MS) {
    return cachedOwner.repos;
  }

  try {
    const octokit = await getOctokit();
    const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
      org: owner,
      type: "all",
      per_page: 100,
    });

    const templateRepos = repos
      .filter((repo) => repo.is_template === true)
      .map((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        private: repo.private,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.owners[owner] = { cachedAt: now, repos: templateRepos };
    try {
      await Bun.write(
        `${getCacheDir()}/${TEMPLATE_REPOS_CACHE_FILE}`,
        `${JSON.stringify(cache, null, 2)}\n`,
      );
    } catch {
      // Cache persistence is optional here because fresh template data is already loaded.
    }
    return templateRepos;
  } catch (error) {
    if (cachedOwner) return cachedOwner.repos;
    throw error;
  }
}

export async function getGitHubTemplateRepo(
  owner: string,
  repoName: string,
): Promise<GitHubTemplateRepo | null> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    if (data.is_template !== true) return null;

    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      htmlUrl: data.html_url,
      private: data.private,
    };
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createGitHubRepoFromTemplate(
  input: CreateGitHubRepoFromTemplateInput,
): Promise<CreatedGitHubRepo> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.createUsingTemplate({
      template_owner: input.templateOwner,
      template_repo: input.templateRepo,
      owner: input.owner,
      name: input.name,
      description: input.description || undefined,
      private: input.private,
      include_all_branches: false,
    });

    return {
      name: data.name,
      fullName: data.full_name,
      htmlUrl: data.html_url,
      cloneUrl: data.clone_url,
      sshUrl: data.ssh_url,
    };
  } catch (error) {
    logError("github", "repos.createFromTemplate.error", "Template repo creation failed", {
      owner: input.owner,
      name: input.name,
      template: `${input.templateOwner}/${input.templateRepo}`,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Creates a blank org repo initialized with an MIT license. */
export async function createGitHubRepo(input: CreateGitHubRepoInput): Promise<CreatedGitHubRepo> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.createInOrg({
      org: input.owner,
      name: input.name,
      description: input.description || undefined,
      private: input.private,
      auto_init: true,
      license_template: "mit",
      ...BASE_REPO_SETTINGS,
    });

    return {
      name: data.name,
      fullName: data.full_name,
      htmlUrl: data.html_url,
      cloneUrl: data.clone_url,
      sshUrl: data.ssh_url,
    };
  } catch (error) {
    logError("github", "repos.createRepo.error", "Repo creation failed", {
      owner: input.owner,
      name: input.name,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Creates a repo (template or blank) and applies post-create setup in one step.
 *
 * Unexpected setup errors are caught and returned as warnings so callers always
 * receive the created repo even when non-critical configuration fails.
 */
export async function createGitHubRepoWithSetup(
  input: CreateGitHubRepoWithSetupInput,
): Promise<CreateGitHubRepoWithSetupResult> {
  const repo = await (input.templateOwner && input.templateRepo
    ? createGitHubRepoFromTemplate({
        templateOwner: input.templateOwner,
        templateRepo: input.templateRepo,
        owner: input.owner,
        name: input.name,
        description: input.description,
        private: input.private,
      })
    : createGitHubRepo({
        owner: input.owner,
        name: input.name,
        description: input.description,
        private: input.private,
      }));

  let warnings: string[];
  try {
    const setupResult = await applyGitHubRepoSetup({
      owner: input.owner,
      repo: repo.name,
      rulesPreset: input.rulesPreset,
    });
    warnings = setupResult.warnings;
  } catch (error) {
    warnings = [
      `Repository setup failed: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }

  return { repo, warnings };
}

/**
 * Applies best-effort setup after GitHub has created the repository.
 *
 * Setup failures are returned as warnings because repo creation is not rolled
 * back once GitHub has accepted the create request.
 */
export async function applyGitHubRepoSetup(
  input: ApplyGitHubRepoSetupInput,
): Promise<GitHubRepoSetupResult> {
  const setupTasks: Promise<string[]>[] = [
    collectGitHubSetupWarnings(input.owner, input.repo, "Repository settings", async () => {
      await updateGitHubRepoSettings(input.owner, input.repo);
    }),
    collectGitHubSetupWarnings(input.owner, input.repo, "Vulnerability alerts", async () => {
      await enableGitHubVulnerabilityAlerts(input.owner, input.repo);
    }),
  ];

  if (input.rulesPreset !== "none") {
    const preset = input.rulesPreset;
    setupTasks.push(applyGitHubRepoRulesetSetup(input.owner, input.repo, preset));
  }

  const warnings = (await Promise.all(setupTasks)).flat();
  return { warnings };
}

async function updateGitHubRepoSettings(owner: string, repo: string): Promise<void> {
  const octokit = await getOctokit();
  await octokit.rest.repos.update({
    owner,
    repo,
    ...BASE_REPO_SETTINGS,
  });
}

async function enableGitHubVulnerabilityAlerts(owner: string, repo: string): Promise<void> {
  const octokit = await getOctokit();
  await octokit.rest.repos.enableVulnerabilityAlerts({ owner, repo });
}

async function applyGitHubRepoRulesetSetup(
  owner: string,
  repo: string,
  preset: Exclude<GitHubRepoRulesPreset, "none">,
): Promise<string[]> {
  let bypassTeamId: number | null = null;

  const teamWarnings = await collectGitHubSetupWarnings(
    owner,
    repo,
    "Repository rules bypass team lookup",
    async () => {
      const octokit = await getOctokit();
      const { data: team } = await octokit.rest.teams.getByName({
        org: owner,
        team_slug: GITHUB_RULES_BYPASS_TEAM_SLUG,
      });
      bypassTeamId = team.id;
    },
  );
  if (teamWarnings.length) return teamWarnings;
  const resolvedBypassTeamId = bypassTeamId;
  if (resolvedBypassTeamId === null) {
    return ["Repository rules bypass team lookup: GitHub did not return a team ID."];
  }

  return collectGitHubSetupWarnings(owner, repo, "Repository ruleset creation", async () => {
    const octokit = await getOctokit();
    await octokit.rest.repos.createRepoRuleset(
      GITHUB_REPO_RULESET_PRESETS[preset]({ owner, repo, bypassTeamId: resolvedBypassTeamId }),
    );
  });
}

async function collectGitHubSetupWarnings(
  owner: string,
  repo: string,
  label: string,
  run: () => Promise<void>,
): Promise<string[]> {
  try {
    await run();
    return [];
  } catch (error) {
    return [formatGitHubSetupWarning(owner, repo, label, error)];
  }
}

/**
 * Helps differentiate between the PAT token errors and API errors.
 */
function formatGitHubSetupWarning(
  owner: string,
  repo: string,
  label: string,
  error: unknown,
): string {
  const message = error instanceof Error ? error.message : "setup failed";
  const status = getGitHubErrorStatus(error);
  if (status === 404 || message.includes("Resource not accessible by personal access token")) {
    if (status === 404 && label === "Repository rules bypass team lookup") {
      return `${label}: Unable to resolve the bypass team ${owner}/${GITHUB_RULES_BYPASS_TEAM_SLUG}. Ensure the team exists and the token has organization/team read access.`;
    }
    const vulnerabilityHint =
      label === "Vulnerability alerts" ? " Dependabot alerts read/write is also required." : "";
    const teamHint = label.includes("bypass team")
      ? ` The token also needs organization/team read access to resolve ${GITHUB_RULES_BYPASS_TEAM_SLUG}.`
      : "";
    return `${label}: GitHub token cannot configure ${owner}/${repo}. Use an all-repositories fine-grained token for ${owner} with Administration read/write access.${vulnerabilityHint}${teamHint}`;
  }

  return `${label}: ${message}`;
}

function getGitHubErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) return null;
  return typeof error.status === "number" ? error.status : null;
}
