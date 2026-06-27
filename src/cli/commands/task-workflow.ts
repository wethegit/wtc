import { getRepoBranchInfo } from "../../api/github/branches.ts";
import { getTaskBranch } from "../../api/github/task-branches.ts";
import { getGitHubCurrentUser } from "../../api/github/user.ts";
import { writeTaskBranch, writeTaskPr } from "../../api/github/workflows.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import { startLocalTimer } from "../../api/teamwork/timers/local.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { currentBranch, detectRepo, parseGitHubRemoteUrl } from "../../utils/git.ts";

export async function teamworkTaskBranch(args: {
  task: string;
  name?: string;
  startTimer?: boolean;
  json?: boolean;
  startDir?: string;
}): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const taskData = await getTeamworkTaskById(ref.id);

  const repoUrl = await detectRepo(args.startDir ?? process.cwd());
  const repo = repoUrl ? parseGitHubRemoteUrl(repoUrl) : null;
  if (!repoUrl || !repo) {
    throw new Error("Not in a git repo with a GitHub remote.");
  }

  const user = await getGitHubCurrentUser();
  const defaultName = `${user.login}/tw${taskData.id}`;
  const branchName = (args.name ?? "").trim() || defaultName;

  try {
    await writeTaskBranch({
      taskId: taskData.id,
      branchName,
      repoKey: `${repo.owner}/${repo.repo}`,
      projectDir: args.startDir,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log(
        args.json
          ? JSON.stringify({ taskId: taskData.id, branch: branchName, exists: true })
          : `Branch "${branchName}" already exists.`,
      );
      return;
    }
    throw error;
  }

  if (args.startTimer) {
    await startLocalTimer(taskData.id, taskData.name);
  }

  console.log(
    args.json
      ? JSON.stringify({ taskId: taskData.id, taskName: taskData.name, branch: branchName })
      : `Branch "${branchName}" created for task: ${taskData.name}`,
  );
}

export async function teamworkTaskPr(args: {
  task: string;
  target?: string;
  json?: boolean;
  startDir?: string;
}): Promise<void> {
  const ref = getTeamworkTaskReference(args.task);
  const taskData = await getTeamworkTaskById(ref.id);

  const repoUrl = await detectRepo(args.startDir ?? process.cwd());
  const repo = repoUrl ? parseGitHubRemoteUrl(repoUrl) : null;
  if (!repoUrl || !repo) {
    throw new Error("Not in a git repo with a GitHub remote.");
  }

  const branchEntry = await getTaskBranch(`${repo.owner}/${repo.repo}`, taskData.id);
  const branchName = branchEntry?.branch ?? (await currentBranch(args.startDir));
  const title = `feat: ${taskData.name}`;

  let baseBranch = (args.target ?? "").trim();
  if (!baseBranch) {
    try {
      const info = await getRepoBranchInfo(repoUrl);
      baseBranch = info.defaultBranch;
    } catch {
      baseBranch = "main";
    }
  }

  let reviewTask: { id: number; name: string } | undefined;
  const { loadProjectConfig } = await import("../../api/config/manager.ts");
  const config = await loadProjectConfig(args.startDir ?? process.cwd());
  if (config?.teamwork.reviewTaskId) {
    try {
      reviewTask = await getTeamworkTaskById(config.teamwork.reviewTaskId);
    } catch {
      // Stale review task ID in config — ignore
    }
  }

  const result = await writeTaskPr({
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
