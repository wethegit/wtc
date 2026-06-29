import { loadResolvedConfig } from "../../api/config/manager.ts";
import {
  createGitHubRepo,
  createGitHubRepoFromTemplate,
  getGitHubTemplateRepos,
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

  const config = await loadResolvedConfig(args.startDir ?? process.cwd());
  const owner = config.user.github.repoOwner.trim();
  if (!owner) throw new Error("Set github.repoOwner in Settings before creating repos.");

  const templateName = args.template?.trim();
  const description = args.description?.trim() || undefined;
  const isPrivate = args.visibility === "private";
  let repo: CreatedGitHubRepo;

  if (templateName) {
    const templates = await getGitHubTemplateRepos(owner);
    const template = templates.find((candidate) => candidate.name === templateName);
    if (!template) throw new Error(`Template repository not found under ${owner}: ${templateName}`);

    repo = await createGitHubRepoFromTemplate({
      templateOwner: owner,
      templateRepo: template.name,
      owner,
      name,
      description,
      private: isPrivate,
    });
  } else {
    repo = await createGitHubRepo({
      owner,
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
