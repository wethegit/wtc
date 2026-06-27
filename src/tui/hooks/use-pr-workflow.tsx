import { getTaskBranch } from "../../api/github/task-branches.ts";
import { writeTaskPr } from "../../api/github/workflows.ts";
import { getRepoBranchInfo, type RepoBranch } from "../../api/github/branches.ts";
import { loadProjectConfig } from "../../api/config/manager.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import { getTeamworkTaskReference } from "../../api/teamwork/tasks.ts";
import { currentBranch, detectRepo, parseGitHubRemoteUrl } from "../../utils/git.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { DialogInput } from "../components/dialog-input.tsx";
import { DialogSelect } from "../components/dialog-select.tsx";
import type { DialogSelectOption } from "../components/dialog-select.tsx";
import { LoadingDialog } from "../components/loading-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";

type TaskData = { id: number; name: string };
type RepoData = { owner: string; repo: string };

interface FlowContext {
  task: TaskData;
  branchName: string;
  remoteUrl: string;
  repo: RepoData;
  title: string;
  baseBranch: string;
  branches: RepoBranch[];
  reviewTask: TaskData | null;
  resultUrl?: string;
  resultNumber?: number;
  errorMessage?: string;
}

type Step = "title" | "branch-select" | "review-task" | "result" | "error";

export function usePrWorkflow(setMessage: (msg: string) => void) {
  const dialog = useDialog();
  let step: Step | null = null;
  let ctx: FlowContext | null = null;

  const getCtx = (): FlowContext => {
    if (!ctx) throw new Error("Flow context not initialized");
    return ctx;
  };

  const render = () => {
    if (!step || !ctx) {
      dialog.clear();
      return;
    }
    switch (step) {
      case "title":
        dialog.replace(() => (
          <DialogInput
            title="PR Title"
            label="Enter pull request title:"
            initialValue={`feat: ${getCtx().task.name}`}
            confirmLabel="Next"
            onCancel={() => {
              dialog.clear();
              setMessage("PR creation cancelled.");
            }}
            onConfirm={(title) => {
              getCtx().title = title;
              showBranchSelect();
            }}
          />
        ));
        break;

      case "branch-select":
        dialog.replace(() => (
          <DialogSelect<string>
            title="Target Branch"
            onCancel={() => {
              step = "title";
              render();
            }}
            options={buildBranchOptions(getCtx().branches)}
          />
        ));
        break;

      case "review-task": {
        const reviewTask = getCtx().reviewTask;
        dialog.replace(() => (
          <DialogInput
            title="Code Review Task (optional)"
            label="Enter Teamwork task ID or URL for code review tracking:"
            initialValue={reviewTask ? String(reviewTask.id) : ""}
            confirmLabel="Create PR"
            onCancel={() => {
              step = "branch-select";
              render();
            }}
            onConfirm={(input) => handleReviewTaskInput(input)}
          />
        ));
        break;
      }

      case "result":
        dialog.replace(() => (
          <ConfirmDialog
            title="PR Created"
            message={`Draft PR #${getCtx().resultNumber} created: ${getCtx().resultUrl ?? ""}`}
            confirmLabel="Open"
            onConfirm={async () => {
              await openUrlInBrowser(getCtx().resultUrl ?? "");
              dialog.clear();
            }}
          />
        ));
        break;

      case "error":
        dialog.replace(() => (
          <ConfirmDialog
            title="Error"
            message={getCtx().errorMessage ?? ""}
            confirmLabel="OK"
            onConfirm={async () => {}}
          />
        ));
        break;
    }
  };

  const createPrForTask = async (task: TaskData | null) => {
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
    const branchName = branchEntry?.branch ?? (await currentBranch());
    if (!branchName || branchName === "HEAD") {
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

    ctx = {
      task,
      branchName,
      remoteUrl: repoUrl,
      repo,
      title: `feat: ${task.name}`,
      baseBranch: "",
      branches: [],
      reviewTask: null,
    };

    const config = await loadProjectConfig(process.cwd());
    if (config?.teamwork.reviewTaskId) {
      try {
        ctx.reviewTask = await getTeamworkTaskById(config.teamwork.reviewTaskId);
      } catch {
        // Stale review task ID in config — ignore and continue
      }
    }

    step = "title";
    render();
  };

  const showBranchSelect = async () => {
    dialog.replace(() => <LoadingDialog message="Fetching branches..." />);

    try {
      const info = await getRepoBranchInfo(getCtx().remoteUrl);
      getCtx().branches = info.branches;
      getCtx().baseBranch = info.defaultBranch;
      step = "branch-select";
      render();
    } catch {
      // Fallback: skip branch select, use default branch
      getCtx().baseBranch = "";
      step = "review-task";
      render();
    }
  };

  const buildBranchOptions = (branches: RepoBranch[]): DialogSelectOption<string>[] => {
    return branches.map((branch) => ({
      title: branch.name,
      description: branch.default ? "default" : undefined,
      value: branch.name,
      onSelect: () => {
        getCtx().baseBranch = branch.name;
        step = "review-task";
        render();
      },
    }));
  };

  const handleReviewTaskInput = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      createPr(null);
      return;
    }

    try {
      const ref = getTeamworkTaskReference(trimmed);
      getTeamworkTaskById(ref.id)
        .then((reviewTask) => createPr(reviewTask))
        .catch(() => showInvalidReviewTaskError());
    } catch {
      showInvalidReviewTaskError();
    }
  };

  const showInvalidReviewTaskError = () => {
    dialog.replace(() => (
      <ConfirmDialog
        title="Invalid Task"
        message="Could not parse the Teamwork task ID or URL. Go back to retry or skip to continue without a code review task."
        confirmLabel="Go Back"
        cancelLabel="Skip"
        autoClose={false}
        onConfirm={() => {
          step = "review-task";
          render();
        }}
        onCancel={() => createPr(null)}
      />
    ));
  };

  const createPr = async (reviewTask: TaskData | null) => {
    getCtx().reviewTask = reviewTask;

    dialog.replace(() => <LoadingDialog message="Creating draft pull request..." />);

    try {
      const result = await writeTaskPr({
        owner: getCtx().repo.owner,
        repo: getCtx().repo.repo,
        branchName: getCtx().branchName,
        title: getCtx().title,
        task: getCtx().task,
        baseBranch: getCtx().baseBranch || undefined,
        reviewTask: reviewTask ?? undefined,
        repoKey: `${getCtx().repo.owner}/${getCtx().repo.repo}`,
        taskId: getCtx().task.id,
      });

      getCtx().resultUrl = result.url;
      getCtx().resultNumber = result.number;
      step = "result";
      render();
    } catch (error) {
      getCtx().errorMessage =
        error instanceof Error ? error.message : "Failed to create pull request.";
      step = "error";
      render();
    }
  };

  return { createPrForTask };
}
