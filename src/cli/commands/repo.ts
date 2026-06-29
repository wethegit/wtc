import { GITHUB_REPO_OWNER } from "../../api/github/consts.ts";
import { logError, logInfo, logWarn } from "../../api/logs/manager.ts";
import {
  applyGitHubRepoSetup,
  createGitHubRepo,
  createGitHubRepoFromTemplate,
  getGitHubTemplateRepo,
  type CreatedGitHubRepo,
} from "../../api/github/repos.ts";

export type RepoVisibility = "private" | "public";

export async function repoCreate(args: {
  name: string;
  template?: string;
  visibility: RepoVisibility;
  description?: string;
  json: boolean;
  rulesPreset?: string;
  startDir?: string;
}): Promise<void> {
  const name = args.name.trim();
  if (!name) {
    logError("cli.repo", "repo.create.error", "Empty repo name");
    throw new Error("GitHub repository name cannot be empty.");
  }

  const templateName = args.template?.trim();
  const description = args.description?.trim() || undefined;
  const isPrivate = args.visibility === "private";
  const rulesPreset = args.rulesPreset ?? "standard";
  let repo: CreatedGitHubRepo;

  logInfo("cli.repo", "repo.create.start", "Starting repo creation", {
    name,
    template: templateName ?? null,
    visibility: args.visibility,
    rulesPreset,
  });

  try {
    if (templateName) {
      const template = await getGitHubTemplateRepo(GITHUB_REPO_OWNER, templateName);
      if (!template) {
        logError("cli.repo", "repo.create.error", "Template not found", { templateName });
        throw new Error(
          `Template repository not found or not marked as a template under ${GITHUB_REPO_OWNER}: ${templateName}`,
        );
      }

      repo = await createGitHubRepoFromTemplate({
        templateOwner: GITHUB_REPO_OWNER,
        templateRepo: template.name,
        owner: GITHUB_REPO_OWNER,
        name,
        description,
        private: isPrivate,
      });
    } else {
      repo = await createGitHubRepo({
        owner: GITHUB_REPO_OWNER,
        name,
        description,
        private: isPrivate,
      });
    }
  } catch (error) {
    logError("cli.repo", "repo.create.error", "Repo creation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  logInfo("cli.repo", "repo.create.success", "Repo created", { fullName: repo.fullName });

  let setupResult: { warnings: string[] };
  try {
    setupResult = await applyGitHubRepoSetup({
      owner: GITHUB_REPO_OWNER,
      repo: repo.name,
      rulesPreset: rulesPreset as "standard" | "none",
    });
  } catch (error) {
    logWarn("cli.repo", "repo.setup.error", "Setup failed unexpectedly", {
      error: error instanceof Error ? error.message : String(error),
    });
    setupResult = {
      warnings: [
        `Repository setup failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  if (args.json) {
    console.log(
      JSON.stringify({
        name: repo.name,
        fullName: repo.fullName,
        url: repo.htmlUrl,
        cloneUrl: repo.cloneUrl,
        sshUrl: repo.sshUrl,
        warnings: setupResult.warnings,
      }),
    );
    return;
  }

  console.log(`Created GitHub repo: ${repo.htmlUrl}`);

  if (setupResult.warnings.length) {
    for (const warning of setupResult.warnings) {
      logWarn("cli.repo", "repo.setup.warning", warning);
      console.warn(`  Warning: ${warning}`);
    }
  } else {
    logInfo("cli.repo", "repo.setup.success", "Setup completed");
  }
}
