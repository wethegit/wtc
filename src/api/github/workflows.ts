import { createBranch, pushBranch, branchExists } from "../../utils/git.ts";
import { setTaskBranch, setTaskBranchPrUrl } from "./task-branches.ts";
import { createDraftPullRequest } from "./pulls.ts";

export interface WriteTaskBranchInput {
  taskId: number;
  branchName: string;
  repoKey: string;
  projectDir?: string;
}

export async function writeTaskBranch(input: WriteTaskBranchInput): Promise<void> {
  const exists = await branchExists(input.branchName, input.projectDir);
  if (exists) throw new Error(`Branch "${input.branchName}" already exists.`);

  await createBranch(input.branchName, input.projectDir);
  await pushBranch(input.branchName, input.projectDir);
  await setTaskBranch(input.repoKey, input.taskId, input.branchName);
}

export interface WriteTaskPrInput {
  owner: string;
  repo: string;
  branchName: string;
  title: string;
  task: { id: number; name: string };
  baseBranch?: string;
  reviewTask?: { id: number; name: string } | null;
  repoKey: string;
  taskId: number;
  projectDir?: string;
}

export async function writeTaskPr(
  input: WriteTaskPrInput,
): Promise<{ url: string; number: number }> {
  const result = await createDraftPullRequest({
    owner: input.owner,
    repo: input.repo,
    branchName: input.branchName,
    title: input.title,
    task: input.task,
    baseBranch: input.baseBranch,
    reviewTask: input.reviewTask,
    projectDir: input.projectDir,
  });

  await setTaskBranch(input.repoKey, input.taskId, input.branchName);
  await setTaskBranchPrUrl(input.repoKey, input.taskId, result.url);

  if (input.reviewTask) {
    const { loadProjectConfig, saveProjectConfig } = await import("../config/manager.ts");
    const existing = await loadProjectConfig(input.projectDir ?? process.cwd());
    await saveProjectConfig(
      {
        ...(existing ?? {
          version: 1,
          project: { links: [] },
          teamwork: { projectId: null, reviewTaskId: null, pinnedTaskLists: [] },
        }),
        teamwork: {
          ...(existing?.teamwork ?? {
            projectId: null,
            reviewTaskId: null,
            pinnedTaskLists: [],
          }),
          reviewTaskId: input.reviewTask.id,
        },
      },
      input.projectDir ?? process.cwd(),
    );
  }

  return result;
}
