import { getTaskBranch, setTaskBranchPrUrl } from "../../api/github/task-branches.ts";
import { createDraftPullRequest } from "../../api/github/pulls.ts";
import { loadProjectConfig, saveProjectConfig } from "../../api/config/manager.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { detectRepo, parseGitHubRemoteUrl } from "../../utils/git.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { DialogInput } from "../components/dialog-input.tsx";
import { LoadingDialog } from "../components/loading-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";

export function usePrWorkflow(setMessage: (msg: string) => void) {
  const dialog = useDialog();

  const createPrForTask = async (task: { id: number; name: string } | null) => {
    if (!task) {
      setMessage("No task selected.");
      return;
    }

    dialog.replace(() => <LoadingDialog message="Checking branch mapping..." />);

    const repoUrl = await detectRepo();
    const repo = repoUrl ? parseGitHubRemoteUrl(repoUrl) : null;
    if (!repoUrl || !repo) {
      dialog.replace(() => (
        <ConfirmDialog
          title="Error"
          message="Not in a git repo with a GitHub remote."
          confirmLabel="OK"
          onConfirm={async () => {}}
        />
      ));
      return;
    }

    const branchEntry = await getTaskBranch(`${repo.owner}/${repo.repo}`, task.id);
    if (!branchEntry) {
      dialog.replace(() => (
        <ConfirmDialog
          title="No Branch"
          message="No branch found for this task. Create one with ctrl+b first."
          confirmLabel="OK"
          onConfirm={async () => {}}
        />
      ));
      return;
    }

    showTitleStep(task, branchEntry.branch, repo);
  };

  const showTitleStep = (
    task: { id: number; name: string },
    branchName: string,
    repo: { owner: string; repo: string },
  ) => {
    dialog.replace(() => (
      <DialogInput
        title="PR Title"
        label="Enter pull request title:"
        initialValue={`feat: ${task.name}`}
        confirmLabel="Next"
        onCancel={() => {
          dialog.clear();
          setMessage("PR creation cancelled.");
        }}
        onConfirm={(title) => showReviewTaskStep(task, branchName, repo, title)}
      />
    ));
  };

  const showReviewTaskStep = async (
    task: { id: number; name: string },
    branchName: string,
    repo: { owner: string; repo: string },
    title: string,
  ) => {
    const config = await loadProjectConfig(process.cwd());
    const initialValue = config?.teamwork.reviewTaskId ? String(config.teamwork.reviewTaskId) : "";

    dialog.replace(() => (
      <DialogInput
        title="Code Review Task (optional)"
        label="Enter Teamwork task ID or URL for code review tracking:"
        initialValue={initialValue}
        confirmLabel="Create PR"
        onCancel={() => showTitleStep(task, branchName, repo)}
        onConfirm={(input) => handleReviewTaskInput(input, task, branchName, repo, title)}
      />
    ));
  };

  const handleReviewTaskInput = async (
    input: string,
    task: { id: number; name: string },
    branchName: string,
    repo: { owner: string; repo: string },
    title: string,
  ) => {
    const trimmed = input.trim();
    if (!trimmed) {
      await createPr(task, branchName, repo, title, null);
      return;
    }

    try {
      const ref = getTeamworkTaskReference(trimmed);
      const reviewTask = await getTeamworkTaskById(ref.id);
      await createPr(task, branchName, repo, title, reviewTask);
    } catch {
      dialog.replace(() => (
        <ConfirmDialog
          title="Invalid Task"
          message="Could not parse the Teamwork task ID or URL. Go back to retry or skip to continue without a code review task."
          confirmLabel="Go Back"
          cancelLabel="Skip"
          autoClose={false}
          onConfirm={() => showReviewTaskStep(task, branchName, repo, title)}
          onCancel={() => createPr(task, branchName, repo, title, null)}
        />
      ));
    }
  };

  const createPr = async (
    task: { id: number; name: string },
    branchName: string,
    repo: { owner: string; repo: string },
    title: string,
    reviewTask: { id: number; name: string } | null,
  ) => {
    dialog.replace(() => <LoadingDialog message="Creating draft pull request..." />);

    try {
      const result = await createDraftPullRequest({
        owner: repo.owner,
        repo: repo.repo,
        branchName,
        title,
        task,
        reviewTask: reviewTask ?? undefined,
      });

      await setTaskBranchPrUrl(`${repo.owner}/${repo.repo}`, task.id, result.url);
      if (reviewTask) {
        const existing = await loadProjectConfig(process.cwd());
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
              reviewTaskId: reviewTask.id,
            },
          },
          process.cwd(),
        );
      }

      dialog.replace(() => (
        <ConfirmDialog
          title="PR Created"
          message={`Draft PR #${result.number} created: ${result.url}`}
          confirmLabel="Open"
          onConfirm={async () => {
            await openUrlInBrowser(result.url);
            dialog.clear();
          }}
        />
      ));
    } catch (error) {
      dialog.replace(() => (
        <ConfirmDialog
          title="Error"
          message={error instanceof Error ? error.message : "Failed to create pull request."}
          confirmLabel="OK"
          onConfirm={async () => {}}
        />
      ));
    }
  };

  return { createPrForTask };
}
