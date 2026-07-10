import { z } from "zod";

import { GITHUB_REPO_OWNER } from "../../api/github/consts.ts";
import { createGitHubRepoWorkflow } from "../../api/github/repo-creation-workflow.ts";
import { logError, logInfo } from "../../api/logs/manager.ts";
import { createGitHubRepoWithSetup, getGitHubTemplateRepo } from "../../api/github/repos.ts";
import { loadProjectConfig } from "../../api/config/manager.ts";
import {
  getTeamworkCodeReviewTaskInTaskList,
  getTeamworkProjectBootstrapDefaults,
  TEAMWORK_GENERAL_TASK_LIST_DISPLAY_NAME,
} from "../../api/teamwork/task-lists.ts";
import { getTeamworkTaskSummaryById } from "../../api/teamwork/task.ts";
import {
  getTeamworkTaskListReference,
  getTeamworkTaskReference,
} from "../../api/teamwork/tasks.ts";
import { assertCloneTargetAvailable } from "../../utils/git.ts";

const rulesPresetSchema = z.enum(["standard", "none"]);
const positiveIntegerSchema = z.number().int().positive();

function isExplicitSkip(value: string | undefined): boolean {
  return value?.trim() === "-1";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type RepoVisibility = "private" | "public";

export async function repoCreate(args: {
  name: string;
  template?: string;
  visibility: RepoVisibility;
  description?: string;
  json: boolean;
  rulesPreset?: string;
  setupTeamwork?: boolean;
  cloneDir?: string;
  teamworkProjectId?: number;
  generalTasks?: string;
  reviewTask?: string;
  startDir?: string;
}): Promise<void> {
  const name = args.name.trim();
  if (!name) {
    logError("cli.repo", "repo.create.error", "Empty repo name");
    throw new Error("GitHub repository name cannot be empty.");
  }

  const templateName = args.template?.trim();
  const rulesPreset = rulesPresetSchema.parse(args.rulesPreset ?? "standard");
  const startDir = args.startDir ?? process.cwd();

  logInfo("cli.repo", "repo.create.start", "Starting repo creation", {
    name,
    template: templateName ?? null,
    visibility: args.visibility,
    rulesPreset,
    setupTeamwork: Boolean(args.setupTeamwork),
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

  if (args.setupTeamwork) {
    const config = await loadProjectConfig(startDir);
    const rawProjectId = args.teamworkProjectId ?? config?.teamwork.projectId ?? null;
    if (rawProjectId === null) {
      throw new Error(
        "Teamwork project ID is required for --setup-teamwork. Pass --teamwork-project-id or run from a configured WTC project.",
      );
    }
    const teamworkProjectId = positiveIntegerSchema.parse(rawProjectId);
    const skipGeneralTasks = isExplicitSkip(args.generalTasks);
    const skipReviewTask = isExplicitSkip(args.reviewTask);
    const hasGeneralTasksOverride = args.generalTasks !== undefined && !skipGeneralTasks;
    const preflightWarnings: string[] = [];
    let discovered: Awaited<ReturnType<typeof getTeamworkProjectBootstrapDefaults>> = {
      generalTaskList: null,
      codeReviewTask: null,
    };

    if (!hasGeneralTasksOverride && !skipGeneralTasks) {
      try {
        discovered = await getTeamworkProjectBootstrapDefaults(teamworkProjectId);
      } catch (error) {
        preflightWarnings.push(
          `Teamwork optional defaults discovery skipped: ${getErrorMessage(error)}`,
        );
      }
    }
    const generalTaskList = skipGeneralTasks
      ? null
      : hasGeneralTasksOverride
        ? {
            id: getTeamworkTaskListReference(args.generalTasks ?? "").id,
            name: TEAMWORK_GENERAL_TASK_LIST_DISPLAY_NAME,
          }
        : discovered.generalTaskList
          ? {
              id: discovered.generalTaskList.id,
              name: TEAMWORK_GENERAL_TASK_LIST_DISPLAY_NAME,
            }
          : null;

    let reviewTask: { id: number; name: string } | null = null;
    if (!skipReviewTask) {
      if (args.reviewTask) {
        reviewTask = await getTeamworkTaskSummaryById(getTeamworkTaskReference(args.reviewTask).id);
      } else if (generalTaskList) {
        if (discovered.codeReviewTask) {
          reviewTask = discovered.codeReviewTask;
        } else {
          try {
            reviewTask = await getTeamworkCodeReviewTaskInTaskList({
              projectId: teamworkProjectId,
              taskListId: generalTaskList.id,
            });
          } catch (error) {
            preflightWarnings.push(`Code Review task discovery skipped: ${getErrorMessage(error)}`);
          }
        }
      }
    }

    const cloneParentDir = args.cloneDir?.trim() || startDir;
    await assertCloneTargetAvailable(cloneParentDir, name);

    const { repo, bootstrap, warnings } = await createGitHubRepoWorkflow({
      owner: GITHUB_REPO_OWNER,
      name,
      description: args.description?.trim() || undefined,
      private: args.visibility === "private",
      templateOwner,
      templateRepo,
      rulesPreset,
      bootstrap: {
        cloneParentDir,
        teamworkProjectId,
        reviewTaskId: reviewTask?.id ?? null,
        generalTaskList,
      },
    });
    const allWarnings = [...preflightWarnings, ...warnings];

    logInfo("cli.repo", "repo.create.success", "Repo created", { fullName: repo.fullName });

    if (args.json) {
      console.log(
        JSON.stringify({
          name: repo.name,
          fullName: repo.fullName,
          url: repo.htmlUrl,
          cloneUrl: repo.cloneUrl,
          sshUrl: repo.sshUrl,
          bootstrap,
          warnings: allWarnings,
        }),
      );
      return;
    }

    console.log(`Created GitHub repo: ${repo.htmlUrl}`);
    if (bootstrap) console.log(`Bootstrapped WTC config: ${bootstrap.configPath}`);
    if (!generalTaskList) {
      logInfo("cli.repo", "repo.bootstrap.generalTasks.skipped", "Skipped General Tasks config");
      console.log("Skipped General Tasks list config.");
    }
    if (!reviewTask) {
      logInfo("cli.repo", "repo.bootstrap.reviewTask.skipped", "Skipped Code Review task config");
      console.log("Skipped Code Review task config.");
    }
    if (allWarnings.length) {
      for (const warning of allWarnings) {
        console.warn(`  Warning: ${warning}`);
      }
    } else {
      logInfo("cli.repo", "repo.setup.success", "Setup completed");
    }
    return;
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
      console.warn(`  Warning: ${warning}`);
    }
  } else {
    logInfo("cli.repo", "repo.setup.success", "Setup completed");
  }
}
