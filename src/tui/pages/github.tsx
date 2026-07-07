import { createSignal, onCleanup, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { getGitHubAuthStatus, type GitHubAuthStatus } from "../../api/github/auth.ts";
import { GITHUB_REPO_OWNER } from "../../api/github/consts.ts";
import { createGitHubRepoWorkflow } from "../../api/github/repo-creation-workflow.ts";
import {
  createGitHubRepoWithSetup,
  getGitHubTemplateRepos,
  type CreatedGitHubRepo,
  type GitHubRepoRulesPreset,
  type GitHubTemplateRepo,
} from "../../api/github/repos.ts";
import { loadProjectConfig } from "../../api/config/manager.ts";
import {
  getTeamworkCodeReviewTaskInTaskList,
  getTeamworkProjectBootstrapDefaults,
  TEAMWORK_GENERAL_TASK_LIST_DISPLAY_NAME,
} from "../../api/teamwork/task-lists.ts";
import { getTeamworkTaskById } from "../../api/teamwork/task.ts";
import {
  getTeamworkTaskListReference,
  getTeamworkTaskReference,
} from "../../api/teamwork/tasks.ts";
import { logInfo, logWarn, logError } from "../../api/logs/manager.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { assertCloneTargetAvailable } from "../../utils/git.ts";
import { ActionButton } from "../components/forms/action-button.tsx";
import { Card } from "../components/layout/card.tsx";
import { Page } from "../components/layout/page.tsx";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { DialogInput } from "../components/dialog-input.tsx";
import { DialogSelect } from "../components/dialog-select.tsx";
import type { DialogSelectOption } from "../components/dialog-select.tsx";
import { LoadingDialog } from "../components/loading-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

interface RepoCreationDraft {
  template: GitHubTemplateRepo | null;
  name: string;
  description: string;
  private: boolean;
  rulesPreset: GitHubRepoRulesPreset;
  bootstrap: RepoBootstrapDraft | null;
}

interface RepoBootstrapDraft {
  cloneParentDir: string;
  teamworkProjectId: number;
  generalTaskList: {
    id: number;
    name: string;
  };
  reviewTask: {
    id: number;
    name: string;
  };
}

/** GitHub route for creating repositories from approved organization templates. */
export function GitHubPage() {
  const dialog = useDialog();
  const { setHints } = useStatusBar();
  const [githubAuthStatus, setGitHubAuthStatus] = createSignal<GitHubAuthStatus>("missing");
  const [message, setMessage] = createSignal("Loading GitHub context...");
  const [isCreating, setIsCreating] = createSignal(false);

  let creating = false;

  const loadGitHubContext = async () => {
    setMessage("Loading GitHub context...");

    try {
      const authStatus = await getGitHubAuthStatus();

      setGitHubAuthStatus(authStatus);
      if (authStatus === "missing") {
        setMessage("GitHub auth not configured. Use Settings to add your API token.");
        return;
      }

      setMessage(`Ready to create repos under ${GITHUB_REPO_OWNER}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load GitHub context.");
    }
  };

  const startCreateRepo = async () => {
    if (githubAuthStatus() === "missing") {
      logWarn("tui.github", "github.repo.auth.missing", "GitHub auth not configured");
      setMessage("GitHub auth not configured. Use Settings to add your API token.");
      return;
    }

    logInfo("tui.github", "github.repo.flow.start", "Repo creation flow started");
    dialog.replace(() => <LoadingDialog message={`Loading ${GITHUB_REPO_OWNER} templates...`} />);

    try {
      const templates = await getGitHubTemplateRepos(GITHUB_REPO_OWNER);
      logInfo("tui.github", "github.repo.templates.loaded", `Loaded ${templates.length} templates`);
      showTemplateStep(templates);
    } catch (error) {
      logError("tui.github", "github.repo.templates.error", "Template load failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      dialog.replace(() => (
        <ConfirmDialog
          title="Template Load Failed"
          message={error instanceof Error ? error.message : "Failed to load GitHub templates."}
          confirmLabel="OK"
          onConfirm={async () => {}}
        />
      ));
    }
  };

  const triggerCreateRepo = () => {
    if (dialog.active() || isCreating()) return;
    void startCreateRepo();
  };

  const showTemplateStep = (templates: GitHubTemplateRepo[]) => {
    const options: DialogSelectOption<GitHubTemplateRepo | null>[] = [
      {
        title: "none",
        description: "Create a blank repository with an MIT license",
        value: null,
        category: "Blank",
        onSelect: () => showNameStep(null),
      },
      ...templates.map((template) => ({
        title: template.name,
        description: template.description ?? template.fullName,
        value: template,
        category: "Templates",
        onSelect: () => showNameStep(template),
      })),
    ];

    dialog.replace(() => (
      <DialogSelect<GitHubTemplateRepo | null>
        title="Select Template"
        options={options}
        onCancel={() => {
          dialog.clear();
          setMessage("Repo creation cancelled.");
        }}
      />
    ));
  };

  const showNameStep = (template: GitHubTemplateRepo | null) => {
    dialog.replace(() => (
      <DialogInput
        title="Repository Name"
        label="Enter the new repository name:"
        initialValue=""
        confirmLabel="Next"
        onConfirm={(name) =>
          showDescriptionInput({
            template,
            name,
            description: "",
            private: true,
            rulesPreset: "standard",
            bootstrap: null,
          })
        }
        onCancel={() => {
          dialog.clear();
          setMessage("Repo creation cancelled.");
        }}
      />
    ));
  };

  const showDescriptionInput = (draft: RepoCreationDraft) => {
    dialog.replace(() => (
      <DialogInput
        title="Description"
        label="Optional repository description. Leave blank to skip:"
        initialValue=""
        confirmLabel="Next"
        cancelLabel="Skip"
        allowEmpty
        onConfirm={(description) => showVisibilityStep({ ...draft, description })}
        onCancel={() => showVisibilityStep(draft)}
      />
    ));
  };

  const showVisibilityStep = (draft: RepoCreationDraft) => {
    const options: DialogSelectOption<boolean>[] = [
      {
        title: "private",
        description: "Only organization members with access can view it",
        value: true,
        category: "Visibility",
        onSelect: () => showRulesStep({ ...draft, private: true }),
      },
      {
        title: "public",
        description: "Anyone can view it",
        value: false,
        category: "Visibility",
        onSelect: () => showRulesStep({ ...draft, private: false }),
      },
    ];

    dialog.replace(() => (
      <DialogSelect<boolean>
        title="Repository Visibility"
        options={options}
        onCancel={() => showDescriptionInput(draft)}
      />
    ));
  };

  const showRulesStep = (draft: RepoCreationDraft) => {
    const options: DialogSelectOption<GitHubRepoRulesPreset>[] = [
      {
        title: "standard",
        description: "WTC repo settings, vulnerability alerts, and protected branch rules",
        value: "standard",
        category: "Repo Rules",
        onSelect: () => showTeamworkSetupStep({ ...draft, rulesPreset: "standard" }),
      },
      {
        title: "none",
        description: "Create the repo without protected branch rules",
        value: "none",
        category: "Repo Rules",
        onSelect: () => showTeamworkSetupStep({ ...draft, rulesPreset: "none" }),
      },
    ];

    dialog.replace(() => (
      <DialogSelect<GitHubRepoRulesPreset>
        title="Repository Rules"
        options={options}
        onCancel={() => showVisibilityStep(draft)}
      />
    ));
  };

  const showTeamworkSetupStep = (draft: RepoCreationDraft) => {
    dialog.replace(() => (
      <ConfirmDialog
        title="Teamwork Setup"
        message="Would you like to setup Teamwork linking now? WTC will clone the repo, write .wtc.yaml, commit it, and push before repo rules are applied."
        confirmLabel="Set up"
        cancelLabel="Skip"
        autoClose={false}
        onConfirm={() => startTeamworkSetup(draft)}
        onCancel={() => showConfirmStep({ ...draft, bootstrap: null })}
      />
    ));
  };

  const startTeamworkSetup = async (draft: RepoCreationDraft) => {
    dialog.replace(() => <LoadingDialog message="Loading Teamwork project config..." />);

    try {
      const config = await loadProjectConfig(process.cwd());
      const projectId = config?.teamwork.projectId ?? null;
      if (projectId) {
        await resolveTeamworkDefaults(draft, projectId);
      } else {
        showTeamworkProjectInput(draft, "");
      }
    } catch (error) {
      showTeamworkSetupError(
        "Teamwork Setup Failed",
        error instanceof Error ? error.message : "Failed to load Teamwork setup defaults.",
        () => showTeamworkSetupStep(draft),
        () => showConfirmStep({ ...draft, bootstrap: null }),
      );
    }
  };

  const showTeamworkProjectInput = (draft: RepoCreationDraft, initialValue: string) => {
    dialog.replace(() => (
      <DialogInput
        title="Teamwork Project ID"
        label="Enter the Teamwork project ID for this repo:"
        initialValue={initialValue}
        confirmLabel="Next"
        onConfirm={(value) => {
          const projectId = Number(value);
          if (!Number.isInteger(projectId) || projectId <= 0) {
            showTeamworkSetupError(
              "Invalid Project ID",
              "Teamwork project ID must be a positive integer.",
              () => showTeamworkProjectInput(draft, value),
              () => showConfirmStep({ ...draft, bootstrap: null }),
            );
            return;
          }
          void resolveTeamworkDefaults(draft, projectId);
        }}
        onCancel={() => showTeamworkSetupStep(draft)}
      />
    ));
  };

  const resolveTeamworkDefaults = async (draft: RepoCreationDraft, teamworkProjectId: number) => {
    dialog.replace(() => <LoadingDialog message="Discovering Teamwork defaults..." />);

    try {
      const defaults = await getTeamworkProjectBootstrapDefaults(teamworkProjectId);
      if (!defaults.generalTaskList) {
        showGeneralTasksInput(draft, teamworkProjectId, "");
        return;
      }

      const generalTaskList = {
        id: defaults.generalTaskList.id,
        name: TEAMWORK_GENERAL_TASK_LIST_DISPLAY_NAME,
      };
      if (defaults.codeReviewTask) {
        showCloneDirInput(draft, {
          teamworkProjectId,
          generalTaskList,
          reviewTask: defaults.codeReviewTask,
        });
        return;
      }

      showReviewTaskInput(draft, {
        teamworkProjectId,
        generalTaskList,
      });
    } catch (error) {
      showTeamworkSetupError(
        "Teamwork Discovery Failed",
        error instanceof Error ? error.message : "Failed to discover Teamwork defaults.",
        () => showTeamworkProjectInput(draft, teamworkProjectId.toString()),
        () => showConfirmStep({ ...draft, bootstrap: null }),
      );
    }
  };

  const showGeneralTasksInput = (
    draft: RepoCreationDraft,
    teamworkProjectId: number,
    initialValue: string,
  ) => {
    dialog.replace(() => (
      <DialogInput
        title="General Tasks List"
        label="Enter the General Tasks task-list ID or URL:"
        initialValue={initialValue}
        confirmLabel="Next"
        onConfirm={(value) => {
          try {
            const ref = getTeamworkTaskListReference(value);
            void resolveCodeReviewTask(draft, teamworkProjectId, {
              id: ref.id,
              name: TEAMWORK_GENERAL_TASK_LIST_DISPLAY_NAME,
            });
          } catch (error) {
            showTeamworkSetupError(
              "Invalid Task List",
              error instanceof Error ? error.message : "Invalid Teamwork task-list ID or URL.",
              () => showGeneralTasksInput(draft, teamworkProjectId, value),
              () => showConfirmStep({ ...draft, bootstrap: null }),
            );
          }
        }}
        onCancel={() => showTeamworkProjectInput(draft, teamworkProjectId.toString())}
      />
    ));
  };

  const resolveCodeReviewTask = async (
    draft: RepoCreationDraft,
    teamworkProjectId: number,
    generalTaskList: RepoBootstrapDraft["generalTaskList"],
  ) => {
    dialog.replace(() => <LoadingDialog message="Finding Code Review task..." />);

    try {
      const reviewTask = await getTeamworkCodeReviewTaskInTaskList({
        projectId: teamworkProjectId,
        taskListId: generalTaskList.id,
      });
      if (reviewTask) {
        showCloneDirInput(draft, { teamworkProjectId, generalTaskList, reviewTask });
        return;
      }
      showReviewTaskInput(draft, { teamworkProjectId, generalTaskList });
    } catch (error) {
      showTeamworkSetupError(
        "Code Review Search Failed",
        error instanceof Error ? error.message : "Failed to search for the Code Review task.",
        () => showReviewTaskInput(draft, { teamworkProjectId, generalTaskList }),
        () => showConfirmStep({ ...draft, bootstrap: null }),
      );
    }
  };

  const showReviewTaskInput = (
    draft: RepoCreationDraft,
    base: Pick<RepoBootstrapDraft, "teamworkProjectId" | "generalTaskList">,
  ) => {
    dialog.replace(() => (
      <DialogInput
        title="Code Review Task"
        label="Enter the Code Review task ID or URL:"
        initialValue=""
        confirmLabel="Next"
        onConfirm={(value) => {
          try {
            const ref = getTeamworkTaskReference(value);
            getTeamworkTaskById(ref.id)
              .then((reviewTask) => showCloneDirInput(draft, { ...base, reviewTask }))
              .catch((error: unknown) => {
                showTeamworkSetupError(
                  "Invalid Code Review Task",
                  error instanceof Error ? error.message : "Failed to load Code Review task.",
                  () => showReviewTaskInput(draft, base),
                  () => showConfirmStep({ ...draft, bootstrap: null }),
                );
              });
          } catch (error) {
            showTeamworkSetupError(
              "Invalid Code Review Task",
              error instanceof Error ? error.message : "Invalid Teamwork task ID or URL.",
              () => showReviewTaskInput(draft, base),
              () => showConfirmStep({ ...draft, bootstrap: null }),
            );
          }
        }}
        onCancel={() =>
          showGeneralTasksInput(draft, base.teamworkProjectId, base.generalTaskList.id.toString())
        }
      />
    ));
  };

  const showCloneDirInput = (
    draft: RepoCreationDraft,
    base: Omit<RepoBootstrapDraft, "cloneParentDir">,
  ) => {
    const defaultDir = process.cwd();
    dialog.replace(() => (
      <DialogInput
        title="Clone Directory"
        label="Enter the parent directory where this repo should be cloned:"
        initialValue={defaultDir}
        confirmLabel="Next"
        onConfirm={(value) => {
          const cloneParentDir = value.trim() || defaultDir;
          assertCloneTargetAvailable(cloneParentDir, draft.name)
            .then(() => showConfirmStep({ ...draft, bootstrap: { ...base, cloneParentDir } }))
            .catch((error: unknown) => {
              showTeamworkSetupError(
                "Clone Directory Unavailable",
                error instanceof Error ? error.message : "Clone target is not available.",
                () => showCloneDirInput(draft, base),
                () => showConfirmStep({ ...draft, bootstrap: null }),
              );
            });
        }}
        onCancel={() => showReviewTaskInput(draft, base)}
      />
    ));
  };

  const showTeamworkSetupError = (
    title: string,
    message: string,
    onBack: () => void,
    onSkip?: () => void,
  ) => {
    dialog.replace(() => (
      <ConfirmDialog
        title={title}
        message={message}
        confirmLabel="Go Back"
        cancelLabel="Skip Setup"
        autoClose={false}
        onConfirm={onBack}
        onCancel={() => (onSkip ? onSkip() : dialog.clear())}
      />
    ));
  };

  const showConfirmStep = (draft: RepoCreationDraft) => {
    const description = draft.description ? `\nDescription: ${draft.description}` : "";
    const source = draft.template ? `from ${draft.template.fullName}` : "as a blank repo";
    const bootstrap = draft.bootstrap
      ? `\nTeamwork project: ${draft.bootstrap.teamworkProjectId}\nGeneral Tasks: ${draft.bootstrap.generalTaskList.id}\nCode Review: ${draft.bootstrap.reviewTask.name} (#${draft.bootstrap.reviewTask.id})\nClone parent: ${draft.bootstrap.cloneParentDir}`
      : "\nTeamwork setup: skipped";
    dialog.replace(() => (
      <ConfirmDialog
        title="Create Repository"
        message={`Create ${GITHUB_REPO_OWNER}/${draft.name} ${source} as ${draft.private ? "private" : "public"}?\nRules: ${draft.rulesPreset}${description}${bootstrap}`}
        confirmLabel="Create"
        cancelLabel="Back"
        autoClose={false}
        onConfirm={() => createRepo(draft)}
        onCancel={() => showTeamworkSetupStep(draft)}
      />
    ));
  };

  const showSuccessDialog = (
    repo: CreatedGitHubRepo,
    warnings: string[],
    configPath: string | null,
  ) => {
    const warningMessage = warnings.length ? `\n\nSetup warnings:\n${warnings.join("\n")}` : "";
    const bootstrapMessage = configPath ? `\nWTC config: ${configPath}` : "";
    dialog.replace(() => (
      <ConfirmDialog
        title="Repository Created"
        message={`${repo.fullName}\n${repo.htmlUrl}${bootstrapMessage}${warningMessage}`}
        confirmLabel="Open"
        cancelLabel="Close"
        onConfirm={async () => {
          try {
            await openUrlInBrowser(repo.htmlUrl);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to open repository.");
          }
        }}
        onCancel={() => dialog.clear()}
      />
    ));
  };

  const createRepo = async (draft: RepoCreationDraft) => {
    if (creating) return;
    creating = true;
    setIsCreating(true);
    dialog.replace(() => <LoadingDialog message={`Creating ${draft.name}...`} />);

    logInfo("tui.github", "github.repo.create.start", "Creating repo", {
      name: draft.name,
      template: draft.template?.name ?? null,
      private: draft.private,
      rulesPreset: draft.rulesPreset,
    });

    try {
      let repo: CreatedGitHubRepo;
      let warnings: string[];
      let configPath: string | null = null;

      if (draft.bootstrap) {
        const result = await createGitHubRepoWorkflow({
          owner: GITHUB_REPO_OWNER,
          name: draft.name,
          description: draft.description.trim() || undefined,
          private: draft.private,
          templateOwner: draft.template ? GITHUB_REPO_OWNER : undefined,
          templateRepo: draft.template?.name,
          rulesPreset: draft.rulesPreset,
          bootstrap: {
            cloneParentDir: draft.bootstrap.cloneParentDir,
            teamworkProjectId: draft.bootstrap.teamworkProjectId,
            reviewTaskId: draft.bootstrap.reviewTask.id,
            generalTaskList: draft.bootstrap.generalTaskList,
          },
        });
        repo = result.repo;
        warnings = result.warnings;
        configPath = result.bootstrap?.configPath ?? null;
      } else {
        const result = await createGitHubRepoWithSetup({
          owner: GITHUB_REPO_OWNER,
          name: draft.name,
          description: draft.description.trim() || undefined,
          private: draft.private,
          templateOwner: draft.template ? GITHUB_REPO_OWNER : undefined,
          templateRepo: draft.template?.name,
          rulesPreset: draft.rulesPreset,
        });
        repo = result.repo;
        warnings = result.warnings;
      }

      logInfo("tui.github", "github.repo.create.success", "Repo created", {
        fullName: repo.fullName,
      });

      if (warnings.length) {
        logWarn("tui.github", "github.repo.setup.warnings", "Setup warnings", { warnings });
      } else {
        logInfo("tui.github", "github.repo.setup.success", "Setup completed");
      }

      setMessage(
        warnings.length
          ? `Created GitHub repo with setup warnings: ${repo.fullName}`
          : draft.bootstrap
            ? `Created and bootstrapped GitHub repo: ${repo.fullName}`
            : `Created GitHub repo: ${repo.fullName}`,
      );
      showSuccessDialog(repo, warnings, configPath);
    } catch (error) {
      logError("tui.github", "github.repo.create.error", "Repo creation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      dialog.replace(() => (
        <ConfirmDialog
          title="Repo Creation Failed"
          message={error instanceof Error ? error.message : "Failed to create GitHub repo."}
          confirmLabel="OK"
          onConfirm={async () => {}}
        />
      ));
      setMessage(error instanceof Error ? error.message : "Failed to create GitHub repo.");
    } finally {
      creating = false;
      setIsCreating(false);
    }
  };

  useBindings(() => ({
    enabled: !dialog.active(),
    bindings: [
      {
        key: "ctrl+n",
        desc: "Create repo from template",
        group: "GitHub",
        cmd: triggerCreateRepo,
      },
      {
        key: "return",
        desc: "Create repo from template",
        group: "GitHub",
        cmd: triggerCreateRepo,
      },
    ],
  }));

  onMount(() => {
    void loadGitHubContext();
    setHints([
      { key: "↵", label: "create" },
      { key: "^N", label: "new repo" },
    ]);
  });

  onCleanup(() => setHints([]));

  return (
    <Page
      title="GitHub"
      status={<text fg={tokens.textDim}>{githubAuthStatus()}</text>}
      message={<text fg={tokens.textDim}>{message()}</text>}
    >
      <box flexDirection="column" gap={1}>
        <Card title="Repo Creation" status={GITHUB_REPO_OWNER}>
          <text attributes={TextAttributes.BOLD} fg={tokens.accent}>
            Create from template
          </text>
          <text fg={tokens.textDim}>
            Templates and new repos are created under {GITHUB_REPO_OWNER}.
          </text>
          <ActionButton
            name="create-github-repo"
            label={isCreating() ? "creating" : "create repo"}
            variant="primary"
            focused={!dialog.active()}
            onPress={triggerCreateRepo}
          />
        </Card>
      </box>
    </Page>
  );
}
