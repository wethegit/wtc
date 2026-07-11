import { logError, logInfo } from "../logs/manager.ts";
import { saveProjectConfig } from "../config/manager.ts";
import { PROJECT_CONFIG_VERSION, type ProjectConfig } from "../config/schema.ts";
import { cloneRepo, commitFile, pushCurrentBranch } from "../../utils/git.ts";

export interface BootstrapGitHubRepoProjectInput {
  repoName: string;
  sshUrl: string;
  cloneParentDir: string;
  teamworkProjectId: number;
  reviewTaskId?: number | null;
  generalTaskList?: {
    id: number;
    name: string;
  } | null;
}

export interface BootstrapGitHubRepoProjectResult {
  cloneDir: string;
  configPath: string;
}

export async function bootstrapGitHubRepoProject(
  input: BootstrapGitHubRepoProjectInput,
): Promise<BootstrapGitHubRepoProjectResult> {
  if (!input.repoName.trim()) throw new Error("GitHub repository name is required.");
  if (!input.sshUrl.trim()) throw new Error("GitHub SSH clone URL is required.");
  if (!Number.isInteger(input.teamworkProjectId) || input.teamworkProjectId <= 0) {
    throw new Error("Teamwork project ID must be a positive integer.");
  }
  if (
    input.reviewTaskId !== null &&
    input.reviewTaskId !== undefined &&
    (!Number.isInteger(input.reviewTaskId) || input.reviewTaskId <= 0)
  ) {
    throw new Error("Teamwork review task ID must be a positive integer.");
  }
  if (
    input.generalTaskList &&
    (!Number.isInteger(input.generalTaskList.id) || input.generalTaskList.id <= 0)
  ) {
    throw new Error("Teamwork general task-list ID must be a positive integer.");
  }
  if (input.generalTaskList && !input.generalTaskList.name.trim()) {
    throw new Error("Teamwork general task-list name is required.");
  }

  try {
    const cloneDir = await cloneRepo({
      remoteUrl: input.sshUrl,
      parentDir: input.cloneParentDir,
      repoName: input.repoName,
    });
    const projectConfig: ProjectConfig = {
      version: PROJECT_CONFIG_VERSION,
      project: { links: [] },
      teamwork: {
        projectId: input.teamworkProjectId,
        reviewTaskId: input.reviewTaskId ?? null,
        pinnedTaskLists: input.generalTaskList
          ? [
              {
                id: input.generalTaskList.id,
                name: input.generalTaskList.name,
              },
            ]
          : [],
      },
    };
    const configPath = await saveProjectConfig(projectConfig, cloneDir);
    await commitFile(".wtc.yaml", "chore: add WTC project config", cloneDir);
    await pushCurrentBranch(cloneDir);

    logInfo("github", "repos.bootstrap.success", "Bootstrapped WTC project config", {
      repoName: input.repoName,
      cloneDir,
      configPath,
    });

    return { cloneDir, configPath };
  } catch (error) {
    logError("github", "repos.bootstrap.error", "Failed to bootstrap WTC project config", {
      repoName: input.repoName,
      cloneParentDir: input.cloneParentDir,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
