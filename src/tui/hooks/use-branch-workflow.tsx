import { getGitHubCurrentUser } from "../../api/github/user.ts";
import { setTaskBranch } from "../../api/github/task-branches.ts";
import { startLocalTimer } from "../../api/teamwork/timers/local.ts";
import {
  detectRepo,
  parseGitHubRemoteUrl,
  createBranch,
  pushBranch,
  branchExists,
} from "../../utils/git.ts";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { DialogInput } from "../components/dialog-input.tsx";
import { useDialog } from "../components/dialog.tsx";

export function useBranchWorkflow(setMessage: (msg: string) => void) {
  const dialog = useDialog();
  let creating = false;

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
      const defaultBranchName = `${user.login}/tw${task.id}`;

      if (await branchExists(defaultBranchName)) {
        dialog.replace(() => (
          <ConfirmDialog
            title="Branch Already Exists"
            message={`Branch "${defaultBranchName}" already exists.`}
            confirmLabel="OK"
            onConfirm={async () => {}}
          />
        ));
        return;
      }

      showTimerStep(task, defaultBranchName, repo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create branch.");
    }
  };

  const showTimerStep = (
    task: { id: number; name: string },
    defaultBranchName: string,
    repo: { owner: string; repo: string },
  ) => {
    dialog.replace(() => (
      <ConfirmDialog
        title="Start Timer"
        message={`Start timer for task "${task.name}"?`}
        confirmLabel="start"
        cancelLabel="skip"
        autoClose={false}
        onConfirm={async () => {
          try {
            await startLocalTimer(task.id, task.name);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to start timer.");
          }
          showNameStep(task, defaultBranchName, repo);
        }}
        onCancel={() => showNameStep(task, defaultBranchName, repo)}
      />
    ));
  };

  const showNameStep = (
    task: { id: number; name: string },
    defaultBranchName: string,
    repo: { owner: string; repo: string },
  ) => {
    dialog.replace(() => (
      <DialogInput
        title="Branch Name"
        label="Enter a name for the new branch:"
        initialValue={defaultBranchName}
        confirmLabel="Create"
        onConfirm={(name) => {
          createBranchAndFinish(task, name, repo);
        }}
      />
    ));
  };

  const createBranchAndFinish = async (
    task: { id: number; name: string },
    branchName: string,
    repo: { owner: string; repo: string },
  ) => {
    if (creating) return;
    creating = true;

    try {
      await createBranch(branchName);
      await pushBranch(branchName);
      await setTaskBranch(`${repo.owner}/${repo.repo}`, task.id, branchName);

      setMessage(`Branch "${branchName}" created for task: ${task.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create branch.");
    }
  };

  return { createBranchForTask };
}
