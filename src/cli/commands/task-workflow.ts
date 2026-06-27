import type { ProjectConfig } from "../../api/config/schema.ts";
import type { RepoBranchInfo } from "../../api/github/branches.ts";
import { getRepoBranchInfo } from "../../api/github/branches.ts";
import type { TaskBranchEntry } from "../../api/github/task-branches.ts";
import { getTaskBranch } from "../../api/github/task-branches.ts";
import { getGitHubCurrentUser } from "../../api/github/user.ts";
import {
  writeTaskBranch as writeTaskBranchImpl,
  writeTaskPr as writeTaskPrImpl,
} from "../../api/github/workflows.ts";
import type { WriteTaskBranchInput, WriteTaskPrInput } from "../../api/github/workflows.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import { startLocalTimer } from "../../api/teamwork/timers/local.ts";
import type { LocalTimerEntry } from "../../api/teamwork/timers/local.ts";
import { getTeamworkTaskReference, type TeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { currentBranch, detectRepo, parseGitHubRemoteUrl } from "../../utils/git.ts";
import type { GitHubRemote } from "../../utils/git.ts";

interface BranchActions {
  getTeamworkTaskReference: (value: string) => TeamworkTaskReference;
  getTeamworkTaskById: (id: number) => Promise<{ id: number; name: string }>;
  getGitHubCurrentUser: () => Promise<{ login: string }>;
  detectRepo: (projectDir?: string) => Promise<string | null>;
  parseGitHubRemoteUrl: (url: string) => GitHubRemote | null;
  startLocalTimer: (
    taskId: number,
    taskName: string,
  ) => Promise<{
    timer: LocalTimerEntry;
    stoppedPrevious: boolean;
  }>;
  writeTaskBranch: (input: WriteTaskBranchInput) => Promise<void>;
}

const branchActions: BranchActions = {
  getTeamworkTaskReference,
  getTeamworkTaskById,
  getGitHubCurrentUser,
  detectRepo,
  parseGitHubRemoteUrl,
  startLocalTimer,
  writeTaskBranch: writeTaskBranchImpl,
};

interface PrActions {
  getTeamworkTaskReference: (value: string) => TeamworkTaskReference;
  getTeamworkTaskById: (id: number) => Promise<{ id: number; name: string }>;
  detectRepo: (projectDir?: string) => Promise<string | null>;
  parseGitHubRemoteUrl: (url: string) => GitHubRemote | null;
  getTaskBranch: (repoKey: string, taskId: number) => Promise<TaskBranchEntry | null>;
  currentBranch: (projectDir?: string) => Promise<string>;
  getRepoBranchInfo: (remoteUrl: string) => Promise<RepoBranchInfo>;
  loadProjectConfig: (startDir: string) => Promise<ProjectConfig | null>;
  writeTaskPr: (input: WriteTaskPrInput) => Promise<{ url: string; number: number }>;
}

const prActions: PrActions = {
  getTeamworkTaskReference,
  getTeamworkTaskById,
  detectRepo,
  parseGitHubRemoteUrl,
  getTaskBranch,
  currentBranch,
  getRepoBranchInfo,
  loadProjectConfig: async (startDir) => {
    const { loadProjectConfig } = await import("../../api/config/manager.ts");
    return loadProjectConfig(startDir);
  },
  writeTaskPr: writeTaskPrImpl,
};

export async function teamworkTaskBranch(
  args: {
    task: string;
    name?: string;
    startTimer?: boolean;
    json?: boolean;
    startDir?: string;
  },
  actions = branchActions,
): Promise<void> {
  const ref = actions.getTeamworkTaskReference(args.task);
  const taskData = await actions.getTeamworkTaskById(ref.id);

  const repoUrl = await actions.detectRepo(args.startDir ?? process.cwd());
  const repo = repoUrl ? actions.parseGitHubRemoteUrl(repoUrl) : null;
  if (!repoUrl || !repo) {
    throw new Error("Not in a git repo with a GitHub remote.");
  }

  const user = await actions.getGitHubCurrentUser();
  const defaultName = `${user.login}/tw${taskData.id}`;
  const branchName = (args.name ?? "").trim() || defaultName;

  try {
    await actions.writeTaskBranch({
      taskId: taskData.id,
      branchName,
      repoKey: `${repo.owner}/${repo.repo}`,
      projectDir: args.startDir,
    });
  } catch {
    console.log(
      args.json
        ? JSON.stringify({ taskId: taskData.id, branch: branchName, exists: true })
        : `Branch "${branchName}" already exists.`,
    );
    return;
  }

  if (args.startTimer) {
    await actions.startLocalTimer(taskData.id, taskData.name);
  }

  console.log(
    args.json
      ? JSON.stringify({ taskId: taskData.id, taskName: taskData.name, branch: branchName })
      : `Branch "${branchName}" created for task: ${taskData.name}`,
  );
}

export async function teamworkTaskPr(
  args: {
    task: string;
    target?: string;
    json?: boolean;
    startDir?: string;
  },
  actions = prActions,
): Promise<void> {
  const ref = actions.getTeamworkTaskReference(args.task);
  const taskData = await actions.getTeamworkTaskById(ref.id);

  const repoUrl = await actions.detectRepo(args.startDir ?? process.cwd());
  const repo = repoUrl ? actions.parseGitHubRemoteUrl(repoUrl) : null;
  if (!repoUrl || !repo) {
    throw new Error("Not in a git repo with a GitHub remote.");
  }

  const branchEntry = await actions.getTaskBranch(`${repo.owner}/${repo.repo}`, taskData.id);
  const branchName = branchEntry?.branch ?? (await actions.currentBranch(args.startDir));
  const title = `feat: ${taskData.name}`;

  let baseBranch = (args.target ?? "").trim();
  if (!baseBranch) {
    try {
      const info = await actions.getRepoBranchInfo(repoUrl);
      baseBranch = info.defaultBranch;
    } catch {
      baseBranch = "main";
    }
  }

  let reviewTask: { id: number; name: string } | undefined;
  const config = await actions.loadProjectConfig(args.startDir ?? process.cwd());
  if (config?.teamwork.reviewTaskId) {
    try {
      reviewTask = await actions.getTeamworkTaskById(config.teamwork.reviewTaskId);
    } catch {
      // Stale review task ID in config — ignore
    }
  }

  const result = await actions.writeTaskPr({
    owner: repo.owner,
    repo: repo.repo,
    branchName,
    title,
    task: taskData,
    baseBranch: baseBranch || undefined,
    reviewTask,
    repoKey: `${repo.owner}/${repo.repo}`,
    taskId: taskData.id,
    projectDir: args.startDir,
  });

  console.log(
    args.json
      ? JSON.stringify({
          taskId: taskData.id,
          taskName: taskData.name,
          prUrl: result.url,
          prNumber: result.number,
        })
      : `Draft PR #${result.number} created: ${result.url}`,
  );
}
