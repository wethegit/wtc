import { z } from "zod";

import { getCacheDir } from "../cache/consts.ts";
import { parseGitHubRemoteUrl } from "../../utils/git.ts";

const TASK_BRANCHES_CACHE_FILE = "task-branches.json";

const TaskBranchEntrySchema = z.object({
  branch: z.string(),
  prUrl: z.string().optional(),
  createdAt: z.number(),
});

const TaskBranchesCacheFileSchema = z.object({
  version: z.literal(1),
  repos: z.record(z.string(), z.record(z.string(), TaskBranchEntrySchema)),
});

type TaskBranchesCacheFile = z.infer<typeof TaskBranchesCacheFileSchema>;

function normalizeRepoUrl(url: string): string {
  const parsed = parseGitHubRemoteUrl(url);
  if (parsed) return `${parsed.owner}/${parsed.repo}`;
  return url;
}

export interface TaskBranchEntry {
  branch: string;
  prUrl?: string;
  createdAt: number;
}

export async function getTaskBranch(
  repoUrl: string,
  taskId: number,
): Promise<TaskBranchEntry | null> {
  const cache = await readCache();
  return cache.repos[normalizeRepoUrl(repoUrl)]?.[taskId.toString()] ?? null;
}

export async function setTaskBranch(
  repoUrl: string,
  taskId: number,
  branch: string,
): Promise<void> {
  const cache = await readCache();
  const key = normalizeRepoUrl(repoUrl);
  const repoBranches = cache.repos[key] ?? {};
  repoBranches[taskId.toString()] = { branch, createdAt: Date.now() };
  cache.repos[key] = repoBranches;
  await writeCache(cache);
}

export async function setTaskBranchPrUrl(
  repoUrl: string,
  taskId: number,
  prUrl: string,
): Promise<void> {
  const cache = await readCache();
  const key = normalizeRepoUrl(repoUrl);
  const entry = cache.repos[key]?.[taskId.toString()];
  if (!entry) throw new Error(`No branch found for task ${taskId} in repo ${repoUrl}`);
  entry.prUrl = prUrl;
  await writeCache(cache);
}

async function readCache(): Promise<TaskBranchesCacheFile> {
  try {
    return TaskBranchesCacheFileSchema.parse(
      JSON.parse(await Bun.file(`${getCacheDir()}/${TASK_BRANCHES_CACHE_FILE}`).text()),
    );
  } catch {
    return { version: 1, repos: {} };
  }
}

async function writeCache(cache: TaskBranchesCacheFile): Promise<void> {
  await Bun.write(
    `${getCacheDir()}/${TASK_BRANCHES_CACHE_FILE}`,
    `${JSON.stringify(cache, null, 2)}\n`,
  );
}
