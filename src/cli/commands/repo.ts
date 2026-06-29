import { z } from "zod";

import { GITHUB_REPO_OWNER } from "../../api/github/consts.ts";
import { logError, logInfo, logWarn } from "../../api/logs/manager.ts";
import { createGitHubRepoWithSetup, getGitHubTemplateRepo } from "../../api/github/repos.ts";

const rulesPresetSchema = z.enum(["standard", "none"]);

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
  const rulesPreset = rulesPresetSchema.parse(args.rulesPreset ?? "standard");

  logInfo("cli.repo", "repo.create.start", "Starting repo creation", {
    name,
    template: templateName ?? null,
    visibility: args.visibility,
    rulesPreset,
  });

  let templateOwner: string | undefined;
  let templateRepo: string | undefined;
  if (templateName) {
    const template = await getGitHubTemplateRepo(GITHUB_REPO_OWNER, templateName);
    if (!template) {
      logError("cli.repo", "repo.create.error", "Template not found", { templateName });
      throw new Error(
        `Template repository not found or not marked as a template under ${GITHUB_REPO_OWNER}: ${templateName}`,
      );
    }
    templateOwner = GITHUB_REPO_OWNER;
    templateRepo = template.name;
  }

  const { repo, warnings } = await createGitHubRepoWithSetup({
    owner: GITHUB_REPO_OWNER,
    name,
    description: args.description?.trim() || undefined,
    private: args.visibility === "private",
    templateOwner,
    templateRepo,
    rulesPreset,
  });

  logInfo("cli.repo", "repo.create.success", "Repo created", { fullName: repo.fullName });

  if (args.json) {
    console.log(
      JSON.stringify({
        name: repo.name,
        fullName: repo.fullName,
        url: repo.htmlUrl,
        cloneUrl: repo.cloneUrl,
        sshUrl: repo.sshUrl,
        warnings,
      }),
    );
    return;
  }

  console.log(`Created GitHub repo: ${repo.htmlUrl}`);

  if (warnings.length) {
    for (const warning of warnings) {
      logWarn("cli.repo", "repo.setup.warning", warning);
      console.warn(`  Warning: ${warning}`);
    }
  } else {
    logInfo("cli.repo", "repo.setup.success", "Setup completed");
  }
}
