export interface RepoBranch {
  name: string;
  default: boolean;
}

export interface RepoBranchInfo {
  branches: RepoBranch[];
  defaultBranch: string;
}

function parseLsRemoteOutput(output: string): RepoBranchInfo {
  const lines = output.trim().split("\n").filter(Boolean);
  let defaultBranch = "";
  const branchNames: string[] = [];

  for (const line of lines) {
    const symrefMatch = line.match(/^ref:\s+refs\/heads\/(\S+)\tHEAD$/);
    if (symrefMatch) {
      defaultBranch = symrefMatch[1] ?? "";
      continue;
    }

    const branchMatch = line.match(/^[a-f0-9]+\trefs\/heads\/(\S+)$/);
    if (branchMatch) {
      const name = branchMatch[1];
      if (name) branchNames.push(name);
    }
  }

  branchNames.sort((a, b) => {
    if (a === defaultBranch) return -1;
    if (b === defaultBranch) return 1;
    return a.localeCompare(b);
  });

  return {
    branches: branchNames.map((name) => ({ name, default: name === defaultBranch })),
    defaultBranch,
  };
}

export async function getRepoBranchInfo(remoteUrl: string): Promise<RepoBranchInfo> {
  const result = await Bun.$`git ls-remote --symref ${remoteUrl}`.quiet();
  return parseLsRemoteOutput(result.stdout.toString());
}
