import { join } from "node:path";

import { TEAMWORK_BASE_URL } from "../teamwork/consts.ts";

import { getOctokit } from "./client.ts";

const PR_TEMPLATE_PATHS = [
  ".github/PULL_REQUEST_TEMPLATE.md",
  "docs/PULL_REQUEST_TEMPLATE.md",
  "PULL_REQUEST_TEMPLATE.md",
];

export interface CreatePullRequestInput {
  owner: string;
  repo: string;
  branchName: string;
  title: string;
  task: { id: number; name: string };
  reviewTask?: { id: number; name: string } | null;
  projectDir?: string;
}

export interface CreatePullRequestResult {
  url: string;
  number: number;
}

async function getPrTemplate(projectDir: string): Promise<string> {
  for (const relativePath of PR_TEMPLATE_PATHS) {
    const fullPath = join(projectDir, relativePath);
    try {
      if (await Bun.file(fullPath).exists()) {
        return await Bun.file(fullPath).text();
      }
    } catch {
      return "";
    }
  }
  return "";
}

async function buildPrBody(
  task: { id: number; name: string },
  reviewTask: { id: number; name: string } | null | undefined,
  projectDir: string,
): Promise<string> {
  const taskUrl = `${TEAMWORK_BASE_URL}/app/tasks/${task.id}`;
  const parts: string[] = [];

  parts.push(`**Teamwork Task:** [${task.name}](${taskUrl}) (#${task.id})`);

  if (reviewTask) {
    const reviewTaskUrl = `${TEAMWORK_BASE_URL}/app/tasks/${reviewTask.id}`;
    parts.push(`**Code Review Task:** [${reviewTask.name}](${reviewTaskUrl}) (#${reviewTask.id})`);
  }

  const template = await getPrTemplate(projectDir);
  if (template.trim()) {
    parts.push("");
    parts.push(template.trim());
  }

  return parts.join("\n") + "\n";
}

export async function createDraftPullRequest(
  input: CreatePullRequestInput,
): Promise<CreatePullRequestResult> {
  const octokit = await getOctokit();

  const { data: repo } = await octokit.rest.repos.get({
    owner: input.owner,
    repo: input.repo,
  });

  const body = await buildPrBody(input.task, input.reviewTask, input.projectDir ?? process.cwd());

  const { data } = await octokit.rest.pulls.create({
    owner: input.owner,
    repo: input.repo,
    title: input.title,
    head: input.branchName,
    base: repo.default_branch,
    body,
    draft: true,
  });

  return { url: data.html_url, number: data.number };
}
