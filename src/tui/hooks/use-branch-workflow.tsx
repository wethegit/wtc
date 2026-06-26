import { getGitHubCurrentUser } from "../../api/github/user.ts";
import { setTaskBranch } from "../../api/github/task-branches.ts";
import { detectRepo, parseGitHubRemoteUrl, createBranch, pushBranch } from "../../utils/git.ts";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";

export function useBranchWorkflow(setMessage: (msg: string) => void) {
  const dialog = useDialog();

  const createBranchForTask = async (task: { id: number; name: string } | null) => {
    if (!task) {
      setMessage("No task selected.");
      return;
    }

    const repoUrl = await detectRepo();
    const repo = repoUrl ? parseGitHubRemoteUrl(repoUrl) : null;
    if (!repoUrl || !repo) {
      setMessage("Not in a git repo with a GitHub remote.");
      return;
    }

    try {
      const user = await getGitHubCurrentUser();
      const branchName = `${user.login}/tw${task.id}`;

      dialog.replace(() => (
        <ConfirmDialog
          title="Create Branch"
          message={`Create branch "${branchName}" for task "${task.name}"?`}
          confirmLabel="Create"
          onConfirm={async () => {
            try {
              await createBranch(branchName);
              await pushBranch(branchName);
              await setTaskBranch(`${repo.owner}/${repo.repo}`, task.id, branchName);
              setMessage(`Branch "${branchName}" created for task: ${task.name}`);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Failed to create branch.");
            }
          }}
        />
      ));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create branch.");
    }
  };

  return { createBranchForTask };
}
