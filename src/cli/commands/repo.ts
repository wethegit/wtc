import { GITHUB_REPO_OWNER } from "../../api/github/consts.ts";
import {
  createGitHubRepo,
  createGitHubRepoFromTemplate,
  getGitHubTemplateRepo,
  type CreatedGitHubRepo,
} from "../../api/github/repos.ts";

export type RepoVisibility = "private" | "public";

export async function repoCreate(args: {
  name: string;
  template?: string;
  visibility: RepoVisibility;
  description?: string;
  json: boolean;
  startDir?: string;
}): Promise<void> {
  const name = args.name.trim();
  if (!name) throw new Error("GitHub repository name cannot be empty.");

  const templateName = args.template?.trim();
  const description = args.description?.trim() || undefined;
  const isPrivate = args.visibility === "private";
  let repo: CreatedGitHubRepo;

  if (templateName) {
    const template = await getGitHubTemplateRepo(GITHUB_REPO_OWNER, templateName);
    if (!template) {
      throw new Error(
        `Template repository not found or not marked as a template under ${GITHUB_REPO_OWNER}: ${templateName}`,
      );
    }

    repo = await createGitHubRepoFromTemplate({
      templateOwner: GITHUB_REPO_OWNER,
      templateRepo: template.name,
      owner: GITHUB_REPO_OWNER,
      name,
      description,
      private: isPrivate,
    });
  } else {
    repo = await createGitHubRepo({
      owner: GITHUB_REPO_OWNER,
      name,
      description,
      private: isPrivate,
    });
  }

  if (args.json) {
    console.log(
      JSON.stringify({
        name: repo.name,
        fullName: repo.fullName,
        url: repo.htmlUrl,
        cloneUrl: repo.cloneUrl,
        sshUrl: repo.sshUrl,
      }),
    );
    return;
  }

  console.log(`Created GitHub repo: ${repo.htmlUrl}`);
}
