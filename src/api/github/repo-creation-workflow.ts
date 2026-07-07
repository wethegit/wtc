import { logError, logInfo } from "../logs/manager.ts";

import {
  applyGitHubRepoSetup,
  createGitHubRepo,
  createGitHubRepoFromTemplate,
  type CreatedGitHubRepo,
  type GitHubRepoRulesPreset,
} from "./repos.ts";
import {
  bootstrapGitHubRepoProject,
  type BootstrapGitHubRepoProjectResult,
} from "./repo-bootstrap.ts";

export interface CreateGitHubRepoWorkflowInput {
  owner: string;
  name: string;
  description?: string;
  private: boolean;
  templateOwner?: string;
  templateRepo?: string;
  rulesPreset: GitHubRepoRulesPreset;
  bootstrap?: {
    cloneParentDir: string;
    teamworkProjectId: number;
    reviewTaskId?: number | null;
    generalTaskList?: {
      id: number;
      name: string;
    } | null;
  };
}

export interface CreateGitHubRepoWorkflowResult {
  repo: CreatedGitHubRepo;
  bootstrap: BootstrapGitHubRepoProjectResult | null;
  warnings: string[];
}

export async function createGitHubRepoWorkflow(
  input: CreateGitHubRepoWorkflowInput,
): Promise<CreateGitHubRepoWorkflowResult> {
  if (
    (input.templateOwner && !input.templateRepo) ||
    (!input.templateOwner && input.templateRepo)
  ) {
    throw new Error("Both templateOwner and templateRepo must be provided together.");
  }

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

  const warnings: string[] = [];
  let bootstrap: BootstrapGitHubRepoProjectResult | null = null;

  if (input.bootstrap) {
    try {
      bootstrap = await bootstrapGitHubRepoProject({
        repoName: repo.name,
        sshUrl: repo.sshUrl,
        cloneParentDir: input.bootstrap.cloneParentDir,
        teamworkProjectId: input.bootstrap.teamworkProjectId,
        reviewTaskId: input.bootstrap.reviewTaskId,
        generalTaskList: input.bootstrap.generalTaskList,
      });
    } catch (error) {
      logError("github", "repos.workflow.bootstrap.error", "Repository bootstrap failed", {
        owner: input.owner,
        repo: repo.name,
        error: error instanceof Error ? error.message : String(error),
      });
      warnings.push(
        `Repository bootstrap failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  try {
    const setupResult = await applyGitHubRepoSetup({
      owner: input.owner,
      repo: repo.name,
      rulesPreset: input.rulesPreset,
    });
    warnings.push(...setupResult.warnings);
  } catch (error) {
    logError("github", "repos.workflow.setup.error", "Repository setup failed", {
      owner: input.owner,
      repo: repo.name,
      error: error instanceof Error ? error.message : String(error),
    });
    warnings.push(
      `Repository setup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  logInfo("github", "repos.workflow.success", "Repository creation workflow completed", {
    owner: input.owner,
    repo: repo.name,
    bootstrapped: bootstrap !== null,
    warningCount: warnings.length,
  });

  return { repo, bootstrap, warnings };
}
