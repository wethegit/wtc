import { z } from "zod";

import { GITHUB_REPO_OWNER } from "../../api/github/consts.ts";
import { createGitHubRepoWorkflow } from "../../api/github/repo-creation-workflow.ts";
import { logError, logInfo, logWarn } from "../../api/logs/manager.ts";
import { createGitHubRepoWithSetup, getGitHubTemplateRepo } from "../../api/github/repos.ts";
import { loadProjectConfig } from "../../api/config/manager.ts";
import {
  getTeamworkCodeReviewTaskInTaskList,
  getTeamworkProjectBootstrapDefaults,
  TEAMWORK_GENERAL_TASK_LIST_DISPLAY_NAME,
} from "../../api/teamwork/task-lists.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
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
    const discovered = hasGeneralTasksOverride
      ? { generalTaskList: null, codeReviewTask: null }
      : await getTeamworkProjectBootstrapDefaults(teamworkProjectId);
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

    if (!generalTaskList && !skipGeneralTasks) {
      throw new Error(
        "General Tasks list could not be discovered. Pass --general-tasks with a task-list ID/URL, or pass --general-tasks -1 to skip it.",
      );
    }

    const reviewTask = skipReviewTask
      ? null
      : args.reviewTask
        ? await getTeamworkTaskById(getTeamworkTaskReference(args.reviewTask).id)
        : generalTaskList
          ? (discovered.codeReviewTask ??
            (await getTeamworkCodeReviewTaskInTaskList({
              projectId: teamworkProjectId,
              taskListId: generalTaskList.id,
            })))
          : null;

    if (!reviewTask && !skipReviewTask && !skipGeneralTasks) {
      throw new Error(
        "Code Review task could not be discovered. Pass --review-task with a task ID/URL, or pass --review-task -1 to skip it.",
      );
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
          warnings,
        }),
      );
      return;
    }

    console.log(`Created GitHub repo: ${repo.htmlUrl}`);
    if (bootstrap) console.log(`Bootstrapped WTC config: ${bootstrap.configPath}`);
    if (!generalTaskList) {
      logInfo("cli.repo", "repo.bootstrap.generalTasks.skipped", "Skipped General Tasks config");
      console.log("Skipped General Tasks list config (--general-tasks -1).");
    }
    if (!reviewTask) {
      logInfo("cli.repo", "repo.bootstrap.reviewTask.skipped", "Skipped Code Review task config");
      console.log("Skipped Code Review task config (--review-task -1).");
    }
    if (warnings.length) {
      for (const warning of warnings) {
        logWarn("cli.repo", "repo.setup.warning", warning);
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
      logWarn("cli.repo", "repo.setup.warning", warning);
      console.warn(`  Warning: ${warning}`);
    }
  } else {
    logInfo("cli.repo", "repo.setup.success", "Setup completed");
  }
}
