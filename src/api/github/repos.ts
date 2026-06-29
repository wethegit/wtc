import { getOctokit } from "./client.ts";

/** Template repository shown in the TUI repo creation flow. */
export interface GitHubTemplateRepo {
  owner: string;
  name: string;
  fullName: string;
  description?: string | null;
  htmlUrl: string;
  private: boolean;
}

export interface CreateGitHubRepoFromTemplateInput extends CreateGitHubRepoInput {
  templateOwner: string;
  templateRepo: string;
}

export interface CreateGitHubRepoInput {
  owner: string;
  name: string;
  description?: string;
  private: boolean;
}

/** GitHub repository created by WTC from a template. */
export interface CreatedGitHubRepo {
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
}

export async function getGitHubTemplateRepos(owner: string): Promise<GitHubTemplateRepo[]> {
  const octokit = await getOctokit();
  const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
    org: owner,
    type: "all",
    per_page: 100,
  });

  return repos
    .filter((repo) => repo.is_template === true)
    .map((repo) => ({
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      private: repo.private,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createGitHubRepoFromTemplate(
  input: CreateGitHubRepoFromTemplateInput,
): Promise<CreatedGitHubRepo> {
  const octokit = await getOctokit();
  const { data } = await octokit.rest.repos.createUsingTemplate({
    template_owner: input.templateOwner,
    template_repo: input.templateRepo,
    owner: input.owner,
    name: input.name,
    description: input.description || undefined,
    private: input.private,
    include_all_branches: false,
  });

  return {
    name: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
    sshUrl: data.ssh_url,
  };
}

export async function createGitHubRepo(input: CreateGitHubRepoInput): Promise<CreatedGitHubRepo> {
  const octokit = await getOctokit();
  const { data } = await octokit.rest.repos.createInOrg({
    org: input.owner,
    name: input.name,
    description: input.description || undefined,
    private: input.private,
    auto_init: false,
  });

  return {
    name: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
    sshUrl: data.ssh_url,
  };
}
