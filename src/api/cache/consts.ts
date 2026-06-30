import { homedir } from "node:os";
import { join } from "node:path";

/** Root directory for all deletable runtime data (cache, TUI state, etc.). */
export function getCacheDir(): string {
  return process.env.WTC_CACHE_DIR ?? join(homedir(), ".config", "wtc", "cache");
}

/** Every cache file name known to WTC, mapped from a stable key. */
export const CACHE = {
  templateRepos: "github-template-repos.json",
  githubUser: "github-user.json",
  taskBranches: "task-branches.json",
  teamworkUser: "teamwork-user.json",
  workflowStages: "teamwork-workflow-stages.json",
  localTimers: "teamwork-local-timers.json",
  projectMetadata: "teamwork-project-metadata.json",
  tuiState: "tui-state.json",
  updateCheck: "update-check.json",
  log: "wtc.log",
} as const;

export type CacheKey = keyof typeof CACHE;

/** Category classification for a cache file. */
export type CacheCategory = "cache" | "state" | "log";

/** Stable metadata for a known cache file. */
export interface CacheFileDescriptor {
  key: CacheKey;
  name: string;
  description: string;
  category: CacheCategory;
  ttlDisplay?: string;
}

/** Central registry of every cache file — single source of truth for the System page and cache manager. */
export const CACHE_DESCRIPTORS: CacheFileDescriptor[] = [
  {
    key: "templateRepos",
    name: CACHE.templateRepos,
    description: "Cached GitHub template repositories per org",
    category: "cache",
    ttlDisplay: "24h",
  },
  {
    key: "githubUser",
    name: CACHE.githubUser,
    description: "Authenticated GitHub user profile",
    category: "cache",
    ttlDisplay: "30d",
  },
  {
    key: "taskBranches",
    name: CACHE.taskBranches,
    description: "Task-to-branch name mappings",
    category: "state",
  },
  {
    key: "teamworkUser",
    name: CACHE.teamworkUser,
    description: "Authenticated Teamwork user profile",
    category: "cache",
    ttlDisplay: "30d",
  },
  {
    key: "workflowStages",
    name: CACHE.workflowStages,
    description: "Teamwork workflow stage names and colors",
    category: "cache",
    ttlDisplay: "7d",
  },
  {
    key: "localTimers",
    name: CACHE.localTimers,
    description: "Unsubmitted local timer entries",
    category: "state",
  },
  {
    key: "projectMetadata",
    name: CACHE.projectMetadata,
    description: "Teamwork project name cache",
    category: "cache",
    ttlDisplay: "24h",
  },
  {
    key: "tuiState",
    name: CACHE.tuiState,
    description: "Per-directory TUI navigation state",
    category: "state",
  },
  {
    key: "updateCheck",
    name: CACHE.updateCheck,
    description: "Latest WTC release version cache",
    category: "cache",
    ttlDisplay: "24h",
  },
  {
    key: "log",
    name: CACHE.log,
    description: "Application event log",
    category: "log",
  },
];
